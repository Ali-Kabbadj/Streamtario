import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { WebSocketService } from "./services/websocket.service.js";
import { TorrentController } from "./controllers/torrent.controller.js";
import { createStreamRouter } from "./routes/stream.router.js";
import { createTorrentRouter } from "./routes/torrent.router.js";
import { buildLogger } from "./utils/logger.js";
import { TorrentStreamService } from "./services/torrent-stream.service.js";

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
const logger = buildLogger(import.meta.url);
const keyPath = path.resolve(config.PROJECT_ROOT, "..", "..", "local_dev_deps", "certs/localhost+2-key.pem");
const certPath = path.resolve(config.PROJECT_ROOT, "..", "..", "local_dev_deps", "certs/localhost+2.pem");
const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
const server = https.createServer(httpsOptions, app);

logger.init(`Running in ${config.IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"} mode.`);

const torrentStreamService = TorrentStreamService.getInstance();
new WebSocketService(server, torrentStreamService);

const torrentController = new TorrentController(torrentStreamService);
const streamRouter = createStreamRouter();
const torrentRouter = createTorrentRouter(torrentController);

app.use("/", streamRouter);
app.use("/torrents", torrentRouter);

server.listen(config.PORT, () => {
    logger.init(`Streaming HTTPS Server live`, { data: { url: `https://localhost:${config.PORT}` } });
});