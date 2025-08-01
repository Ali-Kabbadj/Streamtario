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
  // --- THE FIX: Get the new connect/disconnect functions from the hook ---
  const { isConnected, stats, connect, disconnect } = useStreamingServerStats();

  const totalDownloadSpeed =
    stats?.reduce((acc, t) => acc + t.downloadSpeed, 0) ?? 0;
  const totalUploadSpeed =
    stats?.reduce((acc, t) => acc + t.uploadSpeed, 0) ?? 0;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* --- THE FIX: Wrap with a div and add hover events --- */}
          <div
            onMouseEnter={connect}
            onMouseLeave={disconnect}
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
            <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
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
