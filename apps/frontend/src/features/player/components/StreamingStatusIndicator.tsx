"use client";

import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
import { Wifi, WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatSpeed(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB/s`;
}

export function StreamingStatusIndicator() {
  const { isConnected, stats, requestFastUpdates, requestNormalUpdates } =
    useStreamingServerStats();

  const totalDownloadSpeed =
    stats?.reduce((acc, t) => acc + t.downloadSpeed, 0) ?? 0;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onMouseEnter={requestFastUpdates}
            onMouseLeave={requestNormalUpdates}
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
        <TooltipContent>
          <div className="p-2 text-sm">
            <p className="font-bold">Streaming Server</p>
            {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            {isConnected && (
              <>
                <p>Active Torrents: {stats?.length ?? 0}</p>
                <p>Download: {formatSpeed(totalDownloadSpeed)}</p>
                {/* <p>Upload: {formatSpeed(totalUploadSpeed)}</p> */}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
