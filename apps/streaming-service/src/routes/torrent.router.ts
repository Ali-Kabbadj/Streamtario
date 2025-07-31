import { Router } from "express";
import { TorrentController } from "../controllers/torrent.controller.js";
import { Request, Response } from "express";

export const createTorrentRouter = (torrentController: TorrentController) => {
  const router = Router();

  router.get("/test", (async (req: Request, res: Response) => {
    return res.status(200).json({ info: "working" });
  }));

  router.post("/", torrentController.addTorrent);
  router.post("/:infoHash/select/:fileIndex", torrentController.selectFile);
  router.post("/:infoHash/pause", torrentController.pauseTorrent);
  router.post("/:infoHash/cleanup", torrentController.cleanupTorrent);
  // router.get("/:infoHash/:fileIndex/path", torrentController.getLocalFilePath);
  // router.post("/:infoHash/toggle/:fileIndex", torrentController.toggleFileDownload);

  return router;
};