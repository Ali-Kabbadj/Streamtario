import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { torrServerClient } from '../core/TorrServerClient.js';
import { fileURLToPath } from 'url';
import { sendSuccess, sendError } from './ApiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TORRSERVER_ORIGIN = 'http://0.0.0.0:8090';
const DAEMON_WS_URL = 'ws://0.0.0.0:8090/ws';

export function startServer(port: number) {
    const app = express();
    app.use(express.json());


    // const keyPath = path.resolve(__dirname, '../../../../local_dev_deps/certs/localhost+2-key.pem');
    // const certPath = path.resolve(__dirname, '../../../../local_dev_deps/certs/localhost+2.pem');
    // const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };

    // const server = https.createServer(httpsOptions, app);

    const server = https.createServer(app);
    const wss = new WebSocketServer({ server });

    let daemonWs: WebSocket | null = null;
    let reconnectInterval: NodeJS.Timeout | null = null;

    const connectToDaemon = () => {
        console.log('[DAEMON-WS] Attempting to connect to Go daemon...');
        daemonWs = new WebSocket(DAEMON_WS_URL);

        daemonWs.on('open', () => {
            console.log('[DAEMON-WS] Connection established with Go daemon.');
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
        });

        daemonWs.on('message', (message: Buffer) => {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        });

        daemonWs.on('close', () => {
            console.log('[DAEMON-WS] Connection to Go daemon closed.');
            daemonWs = null;
            if (!reconnectInterval) {
                reconnectInterval = setInterval(connectToDaemon, 3000);
            }
        });

        daemonWs.on('error', (err) => {
            console.error('[DAEMON-WS] Error connecting to Go daemon:', err.message);
        });
    };

    connectToDaemon();

    wss.on('connection', (ws: WebSocket) => {
        console.log('[WSS] Frontend client connected.');
        ws.on('close', () => {
            console.log('[WSS] Frontend client disconnected.');
        });
    });

    app.post('/setup-stream', async (req, res) => {
        const { infoHash, announce, fileIndex } = req.body;
        if (!infoHash || typeof fileIndex !== 'number') {
            return sendError(res, 400, {
                type: 'BAD_REQUEST',
                dev_message: 'infoHash and fileIndex are required body parameters.',
                ui_message: 'Required stream information is missing.',
            });
        }
        try {
            await torrServerClient.addTorrent(infoHash, announce, fileIndex);
            sendSuccess(res, { message: 'Stream setup initiated' });
        } catch (error) {
            console.error('[Controller] Error setting up stream:', error);
            sendError(res, 500, {
                type: 'DAEMON_ERROR',
                dev_message: 'Failed to add torrent to daemon.',
                ui_message: 'Failed to set up stream.',
            });
        }
    });

    app.get('/file-stats/:infoHash/:fileIndex', async (req, res) => {
        const { infoHash, fileIndex } = req.params;
        try {
            const stats = await torrServerClient.getFileStats(infoHash, fileIndex);
            sendSuccess(res, stats);
        } catch (error) {
            console.error(`[Controller] Error getting file stats for ${infoHash}/${fileIndex}:`, error);
            sendError(res, 500, {
                type: 'DAEMON_ERROR',
                dev_message: 'Failed to get file stats from daemon.',
                ui_message: 'Failed to get file stats.',
            });
        }
    });

    app.use('/direct/:infoHash/:fileIndex', (req, res) => {
        const { infoHash, fileIndex } = req.params;
        const proxyUrl = `${TORRSERVER_ORIGIN}/stream/${infoHash}/${fileIndex}`;

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
    });

    app.post('/cleanup/:infoHash', async (req, res) => {
        const { infoHash } = req.params;
        if (!infoHash) {
            return sendError(res, 400, {
                type: 'BAD_REQUEST',
                dev_message: 'infoHash is a required URL parameter.',
                ui_message: 'Info hash is required.',
            });
        }

        console.log(`[Controller] Received cleanup request for ${infoHash}`);
        try {
            await torrServerClient.cleanupTorrent(infoHash);
            sendSuccess(res, { message: 'Cleanup successful.' });
        } catch (error) {
            sendError(res, 500, {
                type: 'DAEMON_ERROR',
                dev_message: 'Failed to cleanup torrent on daemon.',
                ui_message: 'Failed to cleanup torrent.',
            });
        }
    });

    server.listen(port, () => {
        console.log(`🚀 Streaming Controller ready at https://localhost:${port}`);
    });
    return server;
}