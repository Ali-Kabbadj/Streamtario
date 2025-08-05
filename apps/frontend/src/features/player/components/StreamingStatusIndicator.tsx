"use client";

import { useMemo } from "react";
import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
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

  const activeTorrentStats = useMemo(
    () => stats?.find((t) => t.hash === activeStream?.infoHash) ?? null,
    [stats, activeStream],
  );

  const aggregateStats = useMemo(() => {
    if (!stats || stats.length === 0) {
      return null;
    }
    // If there's an active stream, the aggregate should represent *other* torrents.
    const otherTorrents = activeStream
      ? stats.filter((t) => t.hash !== activeStream.infoHash)
      : stats;

    return {
      downloadSpeed: otherTorrents.reduce(
        (acc, t) => acc + t.download_speed,
        0,
      ),
      uploadSpeed: otherTorrents.reduce((acc, t) => acc + t.upload_speed, 0),
      peers: otherTorrents.reduce((acc, t) => acc + t.active_peers, 0),
      count: otherTorrents.length,
    };
  }, [stats, activeStream]);

  const renderTooltipContent = () => {
    if (!isConnected) {
      return (
        <p>
          Status: <span className="text-red-400">Disconnected</span>
        </p>
      );
    }

    if (!stats || stats.length === 0) {
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
              <Users size={14} />{" "}
              {Number.isNaN(activeTorrentStats?.active_peers ?? NaN)
                ? 0
                : (activeTorrentStats?.active_peers ?? 0)}{" "}
              Peers
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

        {!activeTorrentStats && aggregateStats && aggregateStats.count > 0 && (
          <div>
            <p className="font-bold">Daemon Stats</p>
            <div className="flex items-center gap-1.5">
              <File size={14} /> {aggregateStats.count} Active Torrents
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} />{" "}
              {Number.isNaN(aggregateStats?.peers ?? NaN)
                ? 0
                : (aggregateStats?.peers ?? 0)}{" "}
              Peers
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDown size={14} />{" "}
              {formatSpeed(aggregateStats.downloadSpeed)}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUp size={14} /> {formatSpeed(aggregateStats.uploadSpeed)}
            </div>
          </div>
        )}

        {aggregateStats && aggregateStats.count > 0 && (
          <div>
            <p className="font-bold">Other Activity</p>
            <div className="flex items-center gap-1.5">
              <File size={14} /> {aggregateStats.count} Other Torrents
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} />{" "}
              {Number.isNaN(aggregateStats?.peers ?? NaN)
                ? 0
                : (aggregateStats?.peers ?? 0)}{" "}
              Peers
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDown size={14} />{" "}
              {formatSpeed(aggregateStats.downloadSpeed)}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUp size={14} /> {formatSpeed(aggregateStats.uploadSpeed)}
            </div>
          </div>
        )}
      </>
    );
  };

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
          <div className="space-y-1 p-2 text-sm">{renderTooltipContent()}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
