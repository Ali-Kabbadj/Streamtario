import { Request, Response } from "express";
import { WebTorrentService } from "../services/webtorrent.service.js";
import { handleApiError } from "../utils/error.handler.js";
import { getAndValidateTorrentFile } from "../utils/validator.js";
import { buildLogger } from "../utils/logger.js";

const logger = buildLogger(import.meta.url);

export class TorrentController {
  constructor(private webTorrentService: WebTorrentService) { }

  public addTorrent = async (req: Request, res: Response) => {
    // THIS IS THE CORRECT CONTRACT
    const { infoHash, torrentURL } = req.body;
    const context = `/torrents (POST) for infoHash ${infoHash}`;

    if (!infoHash) {
      return res.status(400).json({ error: "infoHash is a required field." });
    }

    try {
      // The identifier for the service will be the URL if it exists, otherwise it will construct a magnet link.
      const identifier = torrentURL || `magnet:?xt=urn:btih:${infoHash}`;

      const torrent = await this.webTorrentService.getOrAddTorrent(identifier, infoHash);

      // Deselect all files by default to save bandwidth
      torrent.deselect(0, torrent.pieces.length - 1, false as any);

      res.status(200).json({
        infoHash: torrent.infoHash,
        name: torrent.name,
        files: torrent.files.map((f, i) => ({
          name: f.name,
          length: f.length,
          index: i,
        })),
      });
    } catch (err) {
      handleApiError(res, err, context);
    }
  };

  public selectFile = (req: Request, res: Response) => {
    const validated = getAndValidateTorrentFile(req, this.webTorrentService);
    if (!validated) {
      return res.status(404).send("Torrent or file not found.");
    }
    const { torrent, file, fileIndex } = validated;
    logger.info("Selecting File From Torrent", { context: "TorrentController", func: 'selectFile', data: { Torrent: torrent.name, FileIndex: fileIndex, FileName: file.name } });
    this.webTorrentService.prioritizeFileForStreaming(torrent, fileIndex);
    if (torrent.paused) {
      torrent.resume();
    }
    res.status(200).json({ message: `File selected for streaming: ${file.name}` });
  };

  public pauseTorrent = (req: Request, res: Response) => {
    const { infoHash } = req.params;
    const torrent = this.webTorrentService.getTorrentFromCache(infoHash);
    if (!torrent) {
      return res.status(404).send("Torrent not found.");
    }
    logger.info("Pausing Torrent", { context: "TorrentController", func: 'pauseTorrent', data: { Torrent: torrent.name } });
    if (!torrent.paused) {
      torrent.pause();
    }
    this.webTorrentService.deprioritizeAllFiles(torrent);
    res.status(200).json({ message: "Torrent paused." });
  };

  public cleanupTorrent = (req: Request, res: Response) => {
    const { infoHash } = req.params;
    logger.info("Destroying torrent from WebTorrent client.", { data: { infoHash } });
    this.webTorrentService.destroyTorrent(infoHash);
    res.status(204).send();
  };
}