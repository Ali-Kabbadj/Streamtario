import { Torrent, TorrentFile } from "webtorrent";

export interface ParsedTorrentInfo {
  infoHash: string;
  name: string;
  announce: string[];
  buffer: Buffer;
  torrentDir: string;
}

export interface ValidatedRequest {
  torrent: Torrent;
  file: TorrentFile;
  fileIndex: number;
}