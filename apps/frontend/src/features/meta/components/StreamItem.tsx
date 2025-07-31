"use client";

import { Badge } from "@/components/ui/badge";
import { parseStream } from "@/lib/stream-parser";
import { Users, HardDrive } from "lucide-react";
import type { ParsedStreamDetails } from "@/lib/stream-parser";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = GetStreamsQuery["profile"]["streams"][0];

interface StreamItemProps {
  stream: Stream;
  parsed: ParsedStreamDetails;
}

export function StreamItem({ stream, parsed }: StreamItemProps) {
  return (
    <a
      href={stream.url ?? `magnet:?xt=urn:btih:${stream.infoHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-accent focus:bg-accent flex flex-col gap-2 rounded-md border border-slate-700 p-3 text-sm transition-colors focus:outline-none"
    >
      <div className="flex items-start justify-between">
        <span className="font-semibold text-white">{parsed.addonName}</span>
        <div className="flex items-center gap-2">
          {parsed.formattedSize && (
            <div className="flex items-center gap-1.5" title="File Size">
              <HardDrive className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400">
                {parsed.formattedSize}
              </span>
            </div>
          )}
          {parsed.seeders !== null && (
            <div className="flex items-center gap-1.5" title="Seeders">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400">{parsed.seeders}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {parsed.filename}
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {parsed.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    </a>
  );
}
