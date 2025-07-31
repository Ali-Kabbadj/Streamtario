import { Router } from "express";
import { WebTorrentService } from "../services/webtorrent.service.js";
import { StreamController } from "../controllers/stream.controller.js";

export const createStreamRouter = () => {
  const router = Router();
  const webTorrentService = WebTorrentService.getInstance();
  const streamController = new StreamController(webTorrentService);

  router.get("/direct/:infoHash/:fileIndex", streamController.directStream);

  return router;
};