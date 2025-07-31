import { Request } from "express";
import { WebTorrentService } from "../services/webtorrent.service.js";
import { ValidatedRequest } from "../interfaces.js";

export function getAndValidateTorrentFile(
  req: Request,
  webTorrentService: WebTorrentService,
): ValidatedRequest | null {
  const { infoHash, fileIndex } = req.params;
  const torrent = webTorrentService.getTorrentFromCache(infoHash);

  if (!torrent) {
    console.error(`[VALIDATE-FAIL] Torrent not in cache: ${infoHash}`);
    return null;
  }

  if (!torrent.files || torrent.files.length === 0) {
    console.error(`[VALIDATE-FAIL] Torrent in cache has no files: ${infoHash}`);
    return null;
  }

  const fileIdx = parseInt(fileIndex, 10);
  if (isNaN(fileIdx) || fileIdx < 0 || fileIdx >= torrent.files.length) {
    console.error(`[VALIDATE-FAIL] Invalid fileIndex: ${fileIndex}`);
    return null;
  }

  return { torrent, file: torrent.files[fileIdx], fileIndex: fileIdx };
}