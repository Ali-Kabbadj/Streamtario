import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { torrServerClient } from '../core/TorrServerClient.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TORRSERVER_ORIGIN = 'http://127.0.0.1:8090';
const FAST_UPDATE_INTERVAL = 500;
const NORMAL_UPDATE_INTERVAL = 2000;

export function startServer(port: number) {
    const app = express();
    const keyPath = path.resolve(__dirname, '../../../../local_dev_deps/certs/localhost+2-key.pem');
    const certPath = path.resolve(__dirname, '../../../../local_dev_deps/certs/localhost+2.pem');
    const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };

    const server = https.createServer(httpsOptions, app);
    const wss = new WebSocketServer({ server });
    let statsInterval: NodeJS.Timeout | null = null;
    const fastUpdateClients = new Set<WebSocket>();

    const broadcastStats = async () => {
        const stats = await torrServerClient.getStats();
        const message = JSON.stringify({ type: 'stats-update', payload: { torrents: stats } });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(message);
        });
    };

    const manageInterval = () => {
        if (statsInterval) clearInterval(statsInterval);
        const interval = fastUpdateClients.size > 0 ? FAST_UPDATE_INTERVAL : NORMAL_UPDATE_INTERVAL;
        console.log(`[WSS] Adjusting broadcast interval to ${interval}ms`);
        statsInterval = setInterval(broadcastStats, interval);
    };

    wss.on('connection', (ws: WebSocket) => {
        console.log('[WSS] Client connected.');

        ws.on('message', (message: string) => {
            try {
                const data = JSON.parse(message);
                if (data.action === 'request_fast_updates') {
                    if (!fastUpdateClients.has(ws)) {
                        fastUpdateClients.add(ws);
                        manageInterval();
                    }
                } else if (data.action === 'request_normal_updates') {
                    if (fastUpdateClients.has(ws)) {
                        fastUpdateClients.delete(ws);
                        manageInterval();
                    }
                }
            } catch (e) { }
        });

        ws.on('close', () => {
            console.log('[WSS] Client disconnected.');
            if (fastUpdateClients.has(ws)) {
                fastUpdateClients.delete(ws);
                manageInterval();
            }
        });

        if (wss.clients.size === 1) {
            manageInterval();
        }
    });

    app.use('/direct/:infoHash/:fileIndex', async (req, res) => {
        const { infoHash, fileIndex } = req.params;

        try {
            await torrServerClient.addTorrent(infoHash);
            const proxyUrl = `${TORRSERVER_ORIGIN}/stream/${infoHash}/${fileIndex}`;
            console.log(`[Proxy] Creating request to daemon: ${proxyUrl}`);

            const proxyReq = http.request(proxyUrl, {
                method: req.method,
                headers: {
                    ...req.headers,
                    host: new URL(TORRSERVER_ORIGIN).host,
                },
            }, (proxyRes) => {
                res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                console.error('[Proxy] Error connecting to daemon:', err);
                if (!res.headersSent) {
                    res.status(502).send('Bad Gateway: Could not connect to torrent daemon.');
                }
            });
            req.pipe(proxyReq);

        } catch (error) {
            console.error('[Controller] Top-level error setting up stream:', error);
            if (!res.headersSent) {
                res.status(500).send('Controller Error: Could not establish stream.');
            }
        }
    });

    app.post('/cleanup/:infoHash', async (req, res) => {
        const { infoHash } = req.params;
        if (!infoHash) {
            return res.status(400).send('Infohash is required.');
        }

        console.log(`[Controller] Received cleanup request for ${infoHash}`);
        try {
            await torrServerClient.removeTorrent(infoHash);
            res.status(200).send('Cleanup successful.');
        } catch (error) {
            res.status(500).send('Failed to cleanup torrent on daemon.');
        }
    });
    server.listen(port, () => {
        console.log(`🚀 Streaming Controller ready at https://localhost:${port}`);
        console.log(`   (Controlling TorrServer daemon at ${TORRSERVER_ORIGIN})`);
    });
    return server;
}