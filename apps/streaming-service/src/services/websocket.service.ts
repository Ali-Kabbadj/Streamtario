import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { TorrentStreamService } from "./torrent-stream.service.js";

export class WebSocketService {
  private wss: WebSocketServer;
  private torrentStreamService: TorrentStreamService;

  constructor(server: Server, torrentStreamService: TorrentStreamService) {
    this.wss = new WebSocketServer({ server });
    this.torrentStreamService = torrentStreamService;
    this.initialize();
  }

  private initialize() {
    this.wss.on("connection", (ws: WebSocket) => {
      this.sendStatsToClient(ws);
    });
    this.torrentStreamService.on('stats_updated', () => this.broadcastStats());
    setInterval(() => this.broadcastStats(), 3000);
  }

  private broadcastStats() {
    if (this.wss.clients.size === 0) return;
    const payload = { type: "stats-update", payload: this.torrentStreamService.getStats() };
    const payloadString = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(payloadString);
    });
  }

  private sendStatsToClient(client: WebSocket) {
    if (client.readyState !== WebSocket.OPEN) return;
    const payload = { type: "stats-update", payload: this.torrentStreamService.getStats() };
    client.send(JSON.stringify(payload));
  }
}