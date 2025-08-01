import { Request, Response } from "express";
import { TorrentStreamService } from "../services/torrent-stream.service.js";
import { pipeline } from "stream";
import { buildLogger } from "../utils/logger.js";

const logger = buildLogger(import.meta.url);

export class StreamController {
  private torrentStreamService: TorrentStreamService;

  constructor() {
    this.torrentStreamService = TorrentStreamService.getInstance();
  }

  public directStream = async (req: Request, res: Response) => {
    const { infoHash, fileIndex: fileIndexStr } = req.params;

    try {
      const fileIndex = parseInt(fileIndexStr, 10);
      if (isNaN(fileIndex)) {
        return res.status(400).send("Invalid file index.");
      }

      // 1. Get the engine (this is fast if it already exists).
      const engine = await this.torrentStreamService.getStreamEngine(infoHash);

      // 2. THIS IS THE FIX: Wait until the engine confirms it's ready to stream this file.
      const file = await this.torrentStreamService.prepareFileForStream(engine, fileIndex);

      logger.stream("Engine is primed. Creating stream for client.", { data: { name: file.name } });

      const fileSize = file.length;
      const { range } = req.headers;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1, 'Content-Type': 'video/mp4'
        });

        const stream = file.createReadStream({ start, end });
        pipeline(stream, res, () => { });

      } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
        const stream = file.createReadStream();
        pipeline(stream, res, () => { });
      }

      res.on('close', () => {
        logger.stream("Client disconnected, cleaning up engine.", { data: { infoHash } });
        this.torrentStreamService.destroyEngine(infoHash);
      });

    } catch (error) {
      logger.error("Streaming failed", { error: (error as Error).message, data: { infoHash } });
      if (!res.headersSent) res.status(500).send((error as Error).message);
    }
  };
}