import axios, { AxiosInstance } from 'axios';
import { AppTorrent, TorrServerTorrent } from '../types/types.js';

const TORRSERVER_BASE_URL = 'http://127.0.0.1:8090';

class TorrServerClient {
    private apiClient: AxiosInstance;

    constructor() {
        this.apiClient = axios.create({
            baseURL: TORRSERVER_BASE_URL,
            headers: { 'Content-Type': 'application/json' }
        });
    }


    public async addTorrent(infoHash: string, announce?: string[]): Promise<void> {
        try {
            await this.apiClient.post('/torrents', {
                action: 'add',
                link: infoHash,
                announce: announce
            });
            console.log(`[TorrServerClient] Add command sent for hash: ${infoHash}`);
        } catch (error) {
            console.error(`[TorrServerClient] Failed to add torrent ${infoHash}:`, error instanceof Error ? error.message : error);
            throw new Error('Failed to communicate with TorrServer daemon.');
        }
    }




    public async cleanupTorrent(infoHash: string): Promise<void> {
        try {
            await this.apiClient.post('/torrents', {
                action: 'cleanup',
                hash: infoHash,
            });
            console.log(`[TorrServerClient] Cleanup command sent for hash: ${infoHash}`);
        } catch (error) {
            console.error(`[TorrServerClient] Failed to cleanup torrent ${infoHash}:`, error instanceof Error ? error.message : error);
        }
    }

    public async getStats(): Promise<AppTorrent[]> {
        try {
            const response = await this.apiClient.post<TorrServerTorrent[]>('/torrents', { action: 'list' });
            return (response.data || []).map(t => ({
                infoHash: t.hash,
                name: t.title,
                progress: t.torrent_size > 0 ? t.loaded_size / t.torrent_size : 0,
                downloadSpeed: t.download_speed,
                uploadSpeed: t.upload_speed,
                numPeers: t.active_peers,
                isPaused: t.stat_string !== 'Working',
            }));
        } catch (error: unknown) {
            console.error('[TorrServerClient] Could not fetch stats:', error instanceof Error ? error.message : error);
            return [];
        }
    }
}

export const torrServerClient = new TorrServerClient();