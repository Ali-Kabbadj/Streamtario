"use client";

import { Download, Upload, Users } from "lucide-react";
import type { TorrentStats } from "../hooks/useStreamingServerStats";

interface StreamingStatsDisplayProps {
  stats: TorrentStats | null;
}

function formatSpeed(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB/s`;
}

export function StreamingStatsDisplay({ stats }: StreamingStatsDisplayProps) {
  if (!stats) return null;

  return (
    <div className="absolute top-4 right-4 flex items-center gap-4 rounded-lg bg-black/50 px-3 py-1.5 text-sm">
      <div className="flex items-center gap-1.5" title="Peers">
        <Users className="h-4 w-4 text-slate-300" />
        <span>{stats.numPeers}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Download Speed">
        <Download className="h-4 w-4 text-slate-300" />
        <span>{formatSpeed(stats.downloadSpeed)}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Upload Speed">
        <Upload className="h-4 w-4 text-slate-300" />
        <span>{formatSpeed(stats.uploadSpeed)}</span>
      </div>
    </div>
  );
}
