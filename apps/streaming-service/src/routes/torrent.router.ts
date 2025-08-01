import { Router } from "express";
import { TorrentController } from "../controllers/torrent.controller.js";

export const createTorrentRouter = (torrentController: TorrentController) => {
    const router = Router();
    router.get("/:infoHash/metadata", torrentController.getMetadata);
    return router;
};