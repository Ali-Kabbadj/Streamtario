import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { WebTorrentService } from "./webtorrent.service.js";
import { buildLogger } from "../utils/logger.js";

const logger = buildLogger(import.meta.url);

export class WebSocketService {
  private wss: WebSocketServer;

  constructor(server: Server, private webTorrentService: WebTorrentService) {
    this.wss = new WebSocketServer({ server });
    this.initialize();
    logger.init("WebSocketService initialized", { context: "WebSocketService Constructor" });
  }

  private initialize() {
    this.wss.on("connection", (ws: WebSocket) => {
      logger.info("Client connected", { context: "WSS" })
      ws.on("close", () => logger.info("Client disconnected.", { context: "WSS", func: 'ON CLOSE' }));
      ws.on("error", (error) => logger.error("wss failed", { context: "WSS", func: 'ON ERROR', error: error }));
    });
    setInterval(() => this.broadcastStats(), 100);
  }

  private broadcastStats() {
    if (this.wss.clients.size === 0) return;
    const payload = {
      type: "stats-update",
      payload: this.webTorrentService.getStats()
    };
    const payloadString = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payloadString);
      }
    });
  }

  public broadcastEvent(type: string, payload: unknown) {
    if (this.wss.clients.size === 0) return;
    const message = {
      type: type,
      payload: payload,
    };
    const messageString = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
}