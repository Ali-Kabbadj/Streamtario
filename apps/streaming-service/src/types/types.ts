export interface AppTorrent {
    infoHash: string;
    name: string;
    progress: number;
    downloadSpeed: number;
    uploadSpeed: number;
    numPeers: number;
    isPaused: boolean;
}

export interface TorrServerTorrent {
    hash: string;
    title: string;
    active_peers: number;
    download_speed: number;
    upload_speed: number;
    torrent_size: number;
    loaded_size: number;
    stat_string: string;
}

export interface FileStats {
    hash: string;
    size: number;
}