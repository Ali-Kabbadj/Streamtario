import { useState, useEffect, useRef, useCallback } from "react";
import { APP_CONFIG } from "@/config/env";
import { useRuntime } from "@/providers/RuntimeProvider";

export interface FileStat {
  index: number;
  path: string;
  bytes_read: number;
  bytes_wasted: number;
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

const wsUrl = APP_CONFIG.NEXT_PUBLIC_STREAMING_SERVICE_URL.replace(
  "https",
  "wss",
);

interface StreamingServerStatsHook {
  isConnected: boolean;
  stats: TorrentStats[];
  subscribeToTorrentReady: (
    infoHash: string,
    callback: () => void,
  ) => () => void;
}

export function useStreamingServerStats(): StreamingServerStatsHook {
  const { isWebView } = useRuntime();
  const [stats, setStats] = useState<TorrentStats[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const readyCallbacks = useRef<Map<string, Set<() => void>>>(new Map());

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
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState < 2) return;

    ws.current = new WebSocket(wsUrl);
    ws.current.onopen = () => {
      setIsConnected(true);
      if (reconnectInterval.current) {
        clearInterval(reconnectInterval.current);
        reconnectInterval.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "stats-update") {
          const incoming: unknown[] = Array.isArray(data.payload?.torrents)
            ? data.payload.torrents
            : [];
          const processed: TorrentStats[] = incoming.map((torrent: unknown) => {
            const torrentStats = torrent as TorrentStats;
            const goal = torrentStats.preload_size ?? 25 * 1024 * 1024;
            const remaining = goal - torrentStats.preloaded_bytes;
            if (remaining > 0 && torrentStats.download_speed > 0) {
              torrentStats.bufferingEtaSeconds =
                remaining / torrentStats.download_speed;
            }
            return torrentStats;
          });
          setStats(processed);
        } else if (data.type === "torrent-ready") {
          const infoHash = data.payload?.infoHash;
          if (infoHash && readyCallbacks.current.has(infoHash)) {
            readyCallbacks.current.get(infoHash)?.forEach((cb) => cb());
            readyCallbacks.current.delete(infoHash);
          }
        }
      } catch (e) {
        console.error("WSS parse error:", e);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      ws.current = null;
      reconnectInterval.current ??= setInterval(connect, 3000);
    };

    ws.current.onerror = (err) => {
      console.error("[WSS Hook] error:", err);
    };
  }, []);

  const subscribeToTorrentReady = useCallback(
    (infoHash: string, callback: () => void) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected, cannot subscribe.");
        return () => {};
      }
      ws.current.send(
        JSON.stringify({
          type: "subscribe-to-torrent-ready",
          payload: { infoHash },
        }),
      );

      if (!readyCallbacks.current.has(infoHash)) {
        readyCallbacks.current.set(infoHash, new Set());
      }
      readyCallbacks.current.get(infoHash)!.add(callback);
      return () => {
        readyCallbacks.current.get(infoHash)?.delete(callback);
        if (readyCallbacks.current.get(infoHash)?.size === 0) {
          readyCallbacks.current.delete(infoHash);
        }
      };
    },
    [],
  );

  useEffect(() => {
    if (!isWebView) {
      setIsConnected(false);
      return;
    }

    connect();
    return () => disconnect();
  }, [connect, disconnect, isWebView]);

  return { isConnected, stats, subscribeToTorrentReady };
}
