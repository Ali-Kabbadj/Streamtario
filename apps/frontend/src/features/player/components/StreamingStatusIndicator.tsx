"use client";

import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
import { Wifi, WifiOff, ArrowDown, ArrowUp, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/providers/PlayerProvider";

function formatSpeed(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B/s";
  if (bytes < 1024) return `${bytes} B/s`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB/s`;
}

export function StreamingStatusIndicator() {
  const { isConnected, stats } = useStreamingServerStats();
  const { activeStream } = usePlayer();

  const activeTorrentStats =
    stats?.find((t) => t.hash === activeStream?.infoHash) ?? null;

  // THE FIX: Use the correct snake_case properties from the stats object.
  const downloadSpeed = activeTorrentStats?.download_speed ?? 0;
  const uploadSpeed = activeTorrentStats?.upload_speed ?? 0;
  const peers = activeTorrentStats?.active_peers ?? 0;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border",
              isConnected
                ? "border-green-500/50 text-green-500"
                : "border-red-500/50 text-red-500",
            )}
          >
            {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
          </div>
        </TooltipTrigger>
        <TooltipContent className="z-[999999]">
          <div className="space-y-1 p-2 text-sm">
            <p className="font-bold">Streaming Server</p>
            <p>
              Status:{" "}
              {isConnected ? (
                <span className="text-green-400">Connected</span>
              ) : (
                <span className="text-red-400">Disconnected</span>
              )}
            </p>
            {isConnected && activeTorrentStats && (
              <>
                <div className="flex items-center gap-1.5">
                  <Users size={14} /> {peers} Peers
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDown size={14} /> {formatSpeed(downloadSpeed)}
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUp size={14} /> {formatSpeed(uploadSpeed)}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
