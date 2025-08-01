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

const baseUrl = new URL(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL);
const wsUrl = `${baseUrl.origin.replace("https", "wss")}/api/v1/stream`;

// This hook now manages an on-demand WebSocket connection.
export function useStreamingServerStats() {
  const [stats, setStats] = useState<TorrentStats[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    // Clean up regardless of ready state to prevent reconnection attempts
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current = null;
      setIsConnected(false);
      setStats(null);
    }
  }, []);

  const connect = useCallback(() => {
    // If already connected or connecting, do nothing.
    if (ws.current && ws.current.readyState < 2) {
      return;
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => {
      setIsConnected(false);
      ws.current = null; // Ensure we can create a new one later
    };
    ws.current.onerror = () => {
      setIsConnected(false);
      ws.current = null;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "stats-update" && data.payload?.torrents) {
          setStats(data.payload.torrents);
        }
      } catch (e) {
        /* Ignore non-JSON messages */
      }
    };
  }, []);

  // Effect to ensure cleanup when the parent component unmounts
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { stats, isConnected, connect, disconnect };
}
