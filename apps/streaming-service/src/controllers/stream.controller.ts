import { Request, Response } from "express";
import { WebTorrentService } from "../services/webtorrent.service.js";
import { getAndValidateTorrentFile } from "../utils/validator.js";
import { pipeline } from "streamx";

export class StreamController {

  constructor(private webTorrentService: WebTorrentService) { }

  public directStream = (req: Request, res: Response) => {
    const validated = getAndValidateTorrentFile(req, this.webTorrentService);
    if (!validated) return res.status(404).send("File not found.");

    const { file } = validated;
    const { length: fileSize } = file;
    const { range } = req.headers;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });
      pipeline(file.createReadStream({ start, end }), res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes'
      });
      pipeline(file.createReadStream(), res);
    }
  };
}