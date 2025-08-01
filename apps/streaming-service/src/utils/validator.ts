import { Request } from "express";
import { WebTorrentService } from "../services/webtorrent.service.js";
import type { Torrent, TorrentFile } from "webtorrent";

export interface ValidatedRequest {
  torrent: Torrent;
  file: TorrentFile;
  fileIndex: number;
}

// THIS ENTIRE VALIDATOR IS NO LONGER NEEDED with the new architecture.
// The new StreamController handles all validation internally.
// You can safely delete this file and remove its import from controllers.
// For now, I'm providing a stub to prevent compile errors.
export function getAndValidateTorrentFile(
  req: Request,
  webTorrentService: WebTorrentService,
): ValidatedRequest | null {
  return null;
}