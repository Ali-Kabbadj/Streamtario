import { type Torrent, type TorrentFile } from "webtorrent";

/**
 * Describes the essential information parsed from a .torrent file buffer.
 */
export interface ParsedTorrentInfo {
  infoHash: string;
  name: string;
  announce: string[];
  buffer: Buffer;
  torrentDir: string;
}

/**
 * A container for a validated Torrent and TorrentFile object,
 */
export interface ValidatedRequest {
  torrent: Torrent;
  file: TorrentFile;
}
