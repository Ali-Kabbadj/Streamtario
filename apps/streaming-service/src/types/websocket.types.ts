/**
 * Represents the statistics for a single file within a torrent.
 */
export interface FileStat {
  name: string;
  length: number;
  progress: number;
}

/**
 * Represents the statistics for a single, active torrent in the client.
 */
export interface TorrentStat {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  isPaused: boolean;
  files: FileStat[];
  announce?: string[]; // Add this line
}

/**
 * The root object for the entire statistics payload broadcast over WebSocket.
 */
export interface StreamingStats {
  globalDownloadSpeed: number;
  globalUploadSpeed: number;
  torrents: TorrentStat[];
}
