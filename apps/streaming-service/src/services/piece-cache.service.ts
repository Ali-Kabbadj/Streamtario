import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { buildLogger } from '../utils/logger.js';

const logger = buildLogger(import.meta.url);

export class PieceCacheService {
    private static instance: PieceCacheService;
    private readonly baseDir: string;

    private constructor() {
        this.baseDir = config.CACHE_BASE_DIR;
    }

    public static getInstance(): PieceCacheService {
        if (!PieceCacheService.instance) {
            PieceCacheService.instance = new PieceCacheService();
        }
        return PieceCacheService.instance;
    }

    private getPiecePath(infoHash: string, pieceIndex: number): string {
        return path.join(this.baseDir, infoHash, pieceIndex.toString());
    }

    public async write(infoHash: string, pieceIndex: number, buffer: Buffer): Promise<void> {
        const piecePath = this.getPiecePath(infoHash, pieceIndex);
        try {
            await fs.mkdir(path.dirname(piecePath), { recursive: true });
            await fs.writeFile(piecePath, buffer);
        } catch (err) {
            logger.error('Failed to write piece to cache', { error: err });
        }
    }

    public async read(infoHash: string, pieceIndex: number): Promise<Buffer> {
        const piecePath = this.getPiecePath(infoHash, pieceIndex);
        return fs.readFile(piecePath);
    }
}