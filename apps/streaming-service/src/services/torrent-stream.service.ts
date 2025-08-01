import torrentStream from 'torrent-stream';
import { buildLogger } from '../utils/logger.js';
import EventEmitter from 'events';

const logger = buildLogger(import.meta.url);

export interface TorrentEngine extends EventEmitter {
    files: torrentStream.TorrentFile[];
    torrent: torrentStream.Torrent;
    swarm: torrentStream.Swarm;
    destroy: (cb?: () => void) => void;
}

export class TorrentStreamService extends EventEmitter {
    private static instance: TorrentStreamService;
    private engines = new Map<string, TorrentEngine>();

    private constructor() {
        super();
        logger.init("TorrentStreamService initialized");
    }

    public static getInstance(): TorrentStreamService {
        if (!TorrentStreamService.instance) {
            TorrentStreamService.instance = new TorrentStreamService();
        }
        return TorrentStreamService.instance;
    }

    private getEngine(infoHash: string): Promise<TorrentEngine> {
        return new Promise((resolve, reject) => {
            const existing = this.engines.get(infoHash);
            if (existing) return resolve(existing);

            const engine = torrentStream(`magnet:?xt=urn:btih:${infoHash}`) as TorrentEngine;
            this.engines.set(infoHash, engine);

            engine.on('ready', () => {
                logger.stream("Engine is ready (metadata loaded)", { data: { name: engine.torrent.name } });
                resolve(engine);
            });
            engine.on('error', (err: any) => reject(err));
        });
    }

    // --- THIS IS THE CRITICAL NEW FUNCTION ---
    public prepareFileForStream(engine: TorrentEngine, fileIndex: number): Promise<torrentStream.TorrentFile> {
        return new Promise((resolve, reject) => {
            const file = engine.files[fileIndex];
            if (!file) return reject(new Error(`File index ${fileIndex} not found.`));

            // Deselect all other files
            engine.files.forEach(f => f.deselect());
            file.select();

            // If we already have the first piece, we are ready to go.
            if (engine.torrent.pieces[0] && engine.bitfield.get(0)) {
                logger.stream("First piece already cached, starting stream immediately.");
                return resolve(file);
            }

            const timeout = setTimeout(() => {
                engine.removeListener('download', onDownload);
                reject(new Error("Timeout: No pieces downloaded. Torrent may have no seeds."));
            }, 30000); // 30-second timeout to get the first piece

            const onDownload = (pieceIndex: number) => {
                logger.stream("Downloaded piece", { data: { pieceIndex } });
                // As soon as we have ANY piece, we can start the stream.
                clearTimeout(timeout);
                engine.removeListener('download', onDownload);
                resolve(file);
            };

            engine.on('download', onDownload);
        });
    }

    public async getMetadata(infoHash: string) {
        const engine = await this.getEngine(infoHash);
        const metadata = {
            name: engine.torrent.name,
            files: engine.files.map((f, i) => ({ name: f.name, length: f.length, index: i })),
        };
        // Destroy the engine after getting metadata; a new one will be made for streaming.
        this.destroyEngine(infoHash);
        return metadata;
    }

    public destroyEngine(infoHash: string) {
        const engine = this.engines.get(infoHash);
        if (engine) {
            engine.destroy(() => {
                this.engines.delete(infoHash);
            });
        }
    }


    public getStats() {
        const torrents: any[] = [];
        for (const [infoHash, engine] of this.engines.entries()) {
            if (engine.torrent) {
                torrents.push({
                    infoHash,
                    name: engine.torrent.name,
                    progress: engine.swarm.downloaded / engine.torrent.length,
                    downloadSpeed: engine.swarm.downloadSpeed(),
                    uploadSpeed: engine.swarm.uploadSpeed(),
                    numPeers: engine.swarm.wires.length,
                });
            }
        }
        return { torrents };
    }
}