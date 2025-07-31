import { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '@/config/env';

// This mirrors the TorrentStat type from the streaming server
export interface TorrentStats {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  isPaused: boolean;
}

const wsUrl = APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('https', 'wss').replace('/graphql', '/api/v1/stream');

export function useStreamingServerStats(activeInfoHash: string | null) {
  const [stats, setStats] = useState<TorrentStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!activeInfoHash) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setIsConnected(false);
      setStats(null);
      return;
    }

    if (!ws.current) {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Streaming server WebSocket connected.');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stats-update' && data.payload?.torrents) {
            const activeTorrentStats = data.payload.torrents.find(
              (t: TorrentStats) => t.infoHash === activeInfoHash
            );
            if (activeTorrentStats) {
              setStats(activeTorrentStats);
            }
          }
        } catch (e) {
            // Ignore non-JSON messages
        }
      };

      ws.current.onclose = () => {
        console.log('Streaming server WebSocket disconnected.');
        setIsConnected(false);
        ws.current = null;
      };
      
      ws.current.onerror = (err) => {
        console.error('Streaming server WebSocket error:', err);
        setIsConnected(false);
        ws.current = null;
      };
    }

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [activeInfoHash]);

  return { stats, isConnected };
}