import WebTorrent, { type Torrent } from "webtorrent";
import { buildLogger } from "../utils/logger.js";
import EventEmitter from "events";

const logger = buildLogger(import.meta.url);

export class WebTorrentService extends EventEmitter {
  private static instance: WebTorrentService;
  private client: WebTorrent.Instance;
  private torrents = new Map<string, Torrent>();

  private constructor() {
    super();
    this.client = new WebTorrent();
    logger.init("WebTorrentService initialized");
  }

  public static getInstance(): WebTorrentService {
    if (!WebTorrentService.instance) {
      WebTorrentService.instance = new WebTorrentService();
    }
    return WebTorrentService.instance;
  }

  public getTorrent(infoHash: string): Promise<Torrent> {
    return new Promise((resolve, reject) => {
      const existing = this.torrents.get(infoHash) || this.client.get(infoHash);
      if (existing && existing.ready) {
        this.torrents.set(infoHash, existing);
        return resolve(existing);
      }

      const torrent = this.client.add(infoHash);

      torrent.once('ready', () => {
        logger.stream("Torrent is ready", { data: { name: torrent.name } });
        this.torrents.set(infoHash, torrent);
        resolve(torrent);
      });
      torrent.once('error', (err) => {
        logger.error("Torrent error", { error: err });
        reject(err)
      });
    });
  }

  public destroyTorrent(infoHash: string) {
    this.client.remove(infoHash, {}, (err) => {
      if (err) logger.error("Error removing torrent", { error: (err as Error).message });
    });
    this.torrents.delete(infoHash);
  }

  // getStats is still useful for the UI
  public getStats() {
    const torrentArray = Array.from(this.client.torrents);
    return {
      globalDownloadSpeed: this.client.downloadSpeed,
      globalUploadSpeed: this.client.uploadSpeed,
      torrents: torrentArray.map(torrent => ({
        infoHash: torrent.infoHash, name: torrent.name, progress: torrent.progress,
        downloadSpeed: torrent.downloadSpeed, uploadSpeed: torrent.uploadSpeed,
        numPeers: torrent.numPeers, isPaused: torrent.paused,
      }))
    };
  }
}