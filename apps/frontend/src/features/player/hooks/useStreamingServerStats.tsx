import { useState, useEffect, useRef, useCallback } from "react";
import { APP_CONFIG } from "@/config/env";

export interface TorrentStats {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  isPaused: boolean;
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

  const sendWsMessage = (message: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  const requestFastUpdates = () =>
    sendWsMessage({ action: "request_fast_updates" });
  const requestNormalUpdates = () =>
    sendWsMessage({ action: "request_normal_updates" });

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

    console.log("[WSS Hook] Attempting to connect...");
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("[WSS Hook] Connection established.");
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
          setStats(data.payload.torrents);
        }
      } catch (e) {
        console.error("Failed to parse stats update from WebSocket:", e);
      }
    };

    ws.current.onclose = () => {
      console.log("[WSS Hook] Connection closed.");
      setIsConnected(false);
      ws.current = null;
      reconnectInterval.current ??= setInterval(connect, 5000);
    };

    ws.current.onerror = (err) => {
      console.error("[WSS Hook] WebSocket error:", err);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, stats, requestFastUpdates, requestNormalUpdates };
}
