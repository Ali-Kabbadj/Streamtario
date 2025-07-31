import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { WebTorrentService } from "./services/webtorrent.service.js";
import { WebSocketService } from "./services/websocket.service.js";
import { TorrentFileService } from "./services/torrent-file.service.js";
import { TorrentController } from "./controllers/torrent.controller.js";
import { createStreamRouter } from "./routes/stream.router.js";
import { createTorrentRouter } from "./routes/torrent.router.js";
import { buildLogger } from "./utils/logger.js";

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());

const logger = buildLogger(import.meta.url);

// --- HTTPS Server Setup ---
const keyPath = path.resolve(config.PROJECT_ROOT, "..", "..", "local_dev_deps", "certs/localhost+2-key.pem");
const certPath = path.resolve(config.PROJECT_ROOT, "..", "..", "local_dev_deps", "certs/localhost+2.pem");
const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
const server = https.createServer(httpsOptions, app);

logger.init(`Running in ${config.IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"} mode.`, { context: "APP CONFIG" });

// 1. Create singleton services.
const webTorrentService = WebTorrentService.getInstance();
const torrentFileService = TorrentFileService.getInstance(); // Will be removed

// 2. Create services that depend on other services.
new WebSocketService(server, webTorrentService);

// 3. Create controllers and inject dependencies.
const torrentController = new TorrentController(
    webTorrentService,
);

// 4. Create routers.
const streamRouter = createStreamRouter();
const torrentRouter = createTorrentRouter(torrentController);

// 5. Register routers at the root.
app.use("/", streamRouter);
app.use("/torrents", torrentRouter);

// --- Server Listen ---
server.listen(config.PORT, () => {
    logger.init(`Streaming HTTPS Server with WebSocket support is live`, { context: 'Server Startup', func: 'listen', data: { url: `https://localhost:${config.PORT}` } });
});