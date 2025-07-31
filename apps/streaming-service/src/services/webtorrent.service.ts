import WebTorrent, { type Torrent } from "webtorrent";
import { config } from "../config.js";
import { buildLogger } from "../utils/logger.js";
import fetch from "node-fetch";

const logger = buildLogger(import.meta.url);

export class WebTorrentService {
  private static instance: WebTorrentService;
  private client: WebTorrent.Instance;
  private pendingTorrents = new Map<string, Promise<Torrent>>();
  private readyTorrentsCache = new Map<string, Torrent>();
  private selectedFiles = new Map<string, Set<number>>();
  private fileProgressCache = new Map<string, Map<number, number>>();

  private constructor() {
    this.client = new WebTorrent();
    this.client.setMaxListeners(120);
    logger.init("WebTorrentService initialized", { context: "WebTorrentService Constructor" });
  }

  public static getInstance(): WebTorrentService {
    if (!WebTorrentService.instance) {
      WebTorrentService.instance = new WebTorrentService();
    }
    return WebTorrentService.instance;
  }

  public getTorrentFromCache(infoHash: string): Torrent | undefined {
    return this.readyTorrentsCache.get(infoHash.toLowerCase());
  }

  public async getOrAddTorrent(identifier: string, infoHash: string): Promise<Torrent> {
    const lowerCaseInfoHash = infoHash.toLowerCase();
    if (this.readyTorrentsCache.has(lowerCaseInfoHash)) {
      return Promise.resolve(this.readyTorrentsCache.get(lowerCaseInfoHash)!);
    }
    if (this.pendingTorrents.has(lowerCaseInfoHash)) {
      return this.pendingTorrents.get(lowerCaseInfoHash)!;
    }

    const addPromise = new Promise<Torrent>(async (resolve, reject) => {
      let torrentIdentifier: string | Buffer = identifier;

      // If the identifier is a URL, fetch the buffer first for maximum reliability
      if (identifier.startsWith('http')) {
        try {
          logger.stream("Fetching .torrent file from addon URL", { data: { url: identifier } });
          const response = await fetch(identifier);
          if (!response.ok) {
            throw new Error(`Failed to fetch .torrent file: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          torrentIdentifier = Buffer.from(arrayBuffer);
        } catch (fetchErr) {
          logger.error("Failed to fetch .torrent file, falling back to magnet.", { error: fetchErr });
          // Fallback to magnet if the URL fetch fails
          torrentIdentifier = `magnet:?xt=urn:btih:${lowerCaseInfoHash}`;
        }
      }

      const torrent = this.client.add(torrentIdentifier, {
        path: config.TORRENTS_BASE_DIR,
      });

      const onReadyOrMetadata = () => {
        if (!torrent.files || torrent.files.length === 0) return;
        const torrentInfoHash = torrent.infoHash.toLowerCase();
        logger.stream(`Torrent ready, entering WARM IDLE state.`, { context: 'Torrent Lifecycle', data: { name: torrent.name, infoHash: torrentInfoHash } });
        this.readyTorrentsCache.set(torrentInfoHash, torrent);
        this.pendingTorrents.delete(torrentInfoHash);
        torrent.removeListener("ready", onReadyOrMetadata);
        torrent.removeListener("metadata", onReadyOrMetadata);
        torrent.removeListener("error", onError);
        resolve(torrent);
      };

      const onError = (err: unknown) => {
        logger.error("Error On Torrent Action", { error: err });
        this.pendingTorrents.delete(lowerCaseInfoHash);
        reject(err);
      };

      torrent.on("ready", onReadyOrMetadata);
      torrent.on("metadata", onReadyOrMetadata);
      torrent.on("error", onError);
    });

    this.pendingTorrents.set(lowerCaseInfoHash, addPromise);
    return addPromise;
  }

  public prioritizeFileForStreaming(torrent: Torrent, fileIndex: number): void {
    logger.stream(`Prioritizing file index ${fileIndex}`, { context: 'File Selection', data: { name: torrent.name } });
    const selections = this.selectedFiles.get(torrent.infoHash) || new Set();
    selections.clear();
    selections.add(fileIndex);
    this.selectedFiles.set(torrent.infoHash, selections);
    torrent.files.forEach((file, index) => {
      if (index === fileIndex) {
        file.select();
      } else {
        file.deselect();
      }
    });
  }

  public deprioritizeAllFiles(torrent: Torrent): void {
    logger.stream(`Deprioritizing all files for Torrent:`, { context: 'File Selection|Prioritization', data: { name: torrent.name } });
    this.selectedFiles.get(torrent.infoHash)?.clear();
    if (torrent.files && torrent.files.length > 0) {
      torrent.files.forEach((file) => file.deselect());
    }
  }

  public destroyTorrent(infoHash: string): void {
    const lowerCaseInfoHash = infoHash.toLowerCase();
    if (this.pendingTorrents.has(lowerCaseInfoHash)) {
      this.pendingTorrents.delete(lowerCaseInfoHash);
    }
    this.selectedFiles.delete(lowerCaseInfoHash);
    this.fileProgressCache.delete(lowerCaseInfoHash);
    const torrent = this.readyTorrentsCache.get(lowerCaseInfoHash);
    if (torrent) {
      logger.stream(`Destroying torrent.`, { context: 'Torrent Lifecycle', data: { TorrentName: torrent.name } });
      torrent.destroy({ destroyStore: false }, (err) => {
        if (err) logger.error(`Failed to destroy torrent`, { context: 'Torrent Lifecycle', error: err, data: { infoHash: lowerCaseInfoHash } });
      });
    }
    this.readyTorrentsCache.delete(lowerCaseInfoHash);
  }

  public getStats() {
    return {
      globalDownloadSpeed: this.client.downloadSpeed,
      globalUploadSpeed: this.client.uploadSpeed,
      torrents: this.client.torrents.map((torrent) => {
        const torrentProgressCache = this.fileProgressCache.get(torrent.infoHash) || new Map<number, number>();
        const filesStats = (torrent.files || []).map((file, index) => {
          let status: 'finished' | 'downloading' | 'paused' | 'queued' = 'queued';
          if (file.progress === 1) {
            status = 'finished';
          } else {
            const lastDownloaded = torrentProgressCache.get(index) ?? 0;
            const currentDownloaded = file.downloaded;
            if (currentDownloaded > lastDownloaded) {
              status = 'downloading';
            } else {
              status = 'paused';
            }
          }
          torrentProgressCache.set(index, file.downloaded);
          return {
            name: file.name,
            length: file.length,
            downloaded: file.downloaded,
            progress: file.progress,
            status: status,
            index: index
          };
        });
        this.fileProgressCache.set(torrent.infoHash, torrentProgressCache);
        return {
          infoHash: torrent.infoHash,
          name: torrent.name,
          progress: torrent.progress,
          downloadSpeed: torrent.downloadSpeed,
          uploadSpeed: torrent.uploadSpeed,
          numPeers: torrent.numPeers,
          isPaused: torrent.paused,
          files: filesStats,
          announce: torrent.announce,
        };
      }),
    };
  }
}