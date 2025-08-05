"use client";

import React, { useState } from "react";
import {
  useStreamingServerStats,
  type TorrentStats,
} from "../hooks/useStreamingServerStats";
import { Wifi, WifiOff, ArrowDown, ArrowUp, Users, File } from "lucide-react";
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

  const activeTorrentStats: TorrentStats | null =
    stats.find((t) => t.hash === activeStream?.infoHash) ?? null;

  const aggregateStats = {
    downloadSpeed: stats.reduce((acc, t) => acc + t.download_speed, 0),
    uploadSpeed: stats.reduce((acc, t) => acc + t.upload_speed, 0),
    peers: stats.reduce((acc, t) => acc + t.active_peers, 0),
    count: stats.length,
  };

  const [isOpen, setIsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);

  const renderTooltipContent = () => {
    if (!isConnected) {
      return (
        <p>
          Status: <span className="text-red-400">Disconnected</span>
        </p>
      );
    }

    if (aggregateStats.count === 0) {
      return (
        <p>
          Status: <span className="text-green-400">Connected & Idle</span>
        </p>
      );
    }

    return (
      <>
        {activeTorrentStats && (
          <div className="mb-2 border-b border-slate-700 pb-2">
            <p className="font-bold">Active Stream</p>
            <div className="flex items-center gap-1.5">
              <Users size={14} /> {activeTorrentStats.active_peers} Peers
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDown size={14} />{" "}
              {formatSpeed(activeTorrentStats.download_speed)}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUp size={14} />{" "}
              {formatSpeed(activeTorrentStats.upload_speed)}
            </div>
          </div>
        )}

        <div>
          <p className="font-bold">Daemon Totals</p>
          <div className="flex items-center gap-1.5">
            <File size={14} /> {aggregateStats.count} Torrent(s)
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} /> {aggregateStats.peers} Total Peers
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDown size={14} /> {formatSpeed(aggregateStats.downloadSpeed)}
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUp size={14} /> {formatSpeed(aggregateStats.uploadSpeed)}
          </div>
        </div>
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) setOpenKey((k) => k + 1);
        }}
      >
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
        <TooltipContent key={openKey} className="z-[999999]">
          <div className="space-y-1 p-2 text-sm">{renderTooltipContent()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
