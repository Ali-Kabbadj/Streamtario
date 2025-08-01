import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import type { Torrent, TorrentFile } from 'webtorrent';
import { config } from '../config.js';
import { buildLogger } from '../utils/logger.js';

const logger = buildLogger(import.meta.url);

// A critical amount of data to be cached before we declare the stream "ready"
const CRITICAL_CACHE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export class CacheService {
    private static instance: CacheService;
    private readonly baseDir: string;
    private cachingInProgress = new Set<string>();

    private constructor() {
        this.baseDir = config.CACHE_BASE_DIR;
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
        logger.init("CacheService initialized", { data: { cacheDir: this.baseDir } });
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    public getCacheFilePath(torrent: Torrent, file: TorrentFile): string {
        return path.join(this.baseDir, torrent.infoHash, file.path);
    }

    public getCacheStatus(cachePath: string, totalSize: number): { isReady: boolean; cachedSize: number } {
        if (!fs.existsSync(cachePath)) {
            return { isReady: false, cachedSize: 0 };
        }
        const stats = fs.statSync(cachePath);
        const isReady = stats.size >= CRITICAL_CACHE_SIZE_BYTES || stats.size >= totalSize;
        return { isReady, cachedSize: stats.size };
    }

    public async startCachingInBackground(torrent: Torrent, file: TorrentFile): Promise<void> {
        const cachePath = this.getCacheFilePath(torrent, file);
        const cacheKey = `${torrent.infoHash}/${file.path}`;

        if (this.cachingInProgress.has(cacheKey) || fs.existsSync(cachePath)) {
            return;
        }

        logger.stream("Starting background cache for file", { data: { file: file.name } });
        this.cachingInProgress.add(cacheKey);

        try {
            await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
            const sourceStream = file.createReadStream();
            const destStream = fs.createWriteStream(cachePath);

            pipeline(sourceStream, destStream, (err) => {
                if (err) {
                    logger.error("Error caching file", { error: err, data: { file: file.name } });
                    fs.unlink(cachePath, () => { });
                } else {
                    logger.stream("Successfully cached file to disk", { data: { file: file.name } });
                }
                this.cachingInProgress.delete(cacheKey);
            });
        } catch (error) {
            logger.error("Failed to initiate cache pipeline", { error });
            this.cachingInProgress.delete(cacheKey);
        }
    }
}