import { useState, useEffect, useRef, useCallback } from "react";
import { APP_CONFIG } from "@/config/env";

export interface FileStat {
  path: string;
  length: number;
}

export interface TorrentStats {
  hash: string;
  title: string;
  stat: number;
  stat_string: string;
  loaded_size: number;
  torrent_size: number;
  preloaded_bytes: number;
  preload_size: number;
  download_speed: number;
  upload_speed: number;
  active_peers: number;
  bufferingEtaSeconds?: number;
  chunks_read_useful?: number;
  category: string;
  chunks_read: number;
  chunks_read_wasted: number;
  connected_seeders: number;
  data: string;
  file_stats: FileStat[];
  half_open_peers: number;
  name: string;
  pending_peers: number;
  pieces_dirtied_bad: number;
  pieces_dirtied_good: number;
  poster: string;
  timestamp: number;
  total_peers: number;
}

interface StatsUpdateMessage {
  type: "stats-update";
  payload: {
    torrents: TorrentStats[];
  };
}

const wsUrl =
  new URL(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL).origin.replace(
    "https",
    "wss",
  ) + "/api/v1/stream";

export function useStreamingServerStats() {
  const [stats, setStats] = useState<TorrentStats[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);

  const disconnect = useCallback(() => {
    if (reconnectInterval.current) {
      clearInterval(reconnectInterval.current);
      reconnectInterval.current = null;
    }
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
      setIsConnected(false);
      setStats(null);
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState < 2) {
      return;
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      if (reconnectInterval.current) {
        clearInterval(reconnectInterval.current);
        reconnectInterval.current = null;
      }
    };

    ws.current.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as StatsUpdateMessage;
        if (data.type === "stats-update" && data.payload?.torrents) {
          const processedTorrents = data.payload.torrents.map((torrent) => {
            const goalBytes =
              torrent.preload_size > 0
                ? torrent.preload_size
                : 25 * 1024 * 1024;
            const remainingBytes = goalBytes - torrent.preloaded_bytes;
            if (remainingBytes > 0 && torrent.download_speed > 0) {
              const eta = remainingBytes / torrent.download_speed;
              return { ...torrent, bufferingEtaSeconds: eta };
            }
            return torrent;
          });
          setStats(processedTorrents);
        }
      } catch (e) {
        console.error("Failed to parse stats update from WebSocket:", e);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      ws.current = null;
      reconnectInterval.current ??= setInterval(connect, 3000);
    };

    ws.current.onerror = (err) => {
      console.error("[WSS Hook] WebSocket error:", err);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, stats };
}
