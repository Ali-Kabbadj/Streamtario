import { Request, Response } from "express";
import { TorrentStreamService } from "../services/torrent-stream.service.js";

export class TorrentController {
    constructor(private torrentStreamService: TorrentStreamService) { }

    public getMetadata = async (req: Request, res: Response) => {
        const { infoHash } = req.params;
        try {
            const metadata = await this.torrentStreamService.getMetadata(infoHash);
            res.status(200).json({ infoHash, ...metadata });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    };
}