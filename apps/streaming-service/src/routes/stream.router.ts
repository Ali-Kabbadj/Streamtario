import { Router } from "express";
import { StreamController } from "../controllers/stream.controller.js";

export const createStreamRouter = () => {
  const router = Router();
  const streamController = new StreamController();
  router.get("/direct/:infoHash/:fileIndex", streamController.directStream);
  return router;
};