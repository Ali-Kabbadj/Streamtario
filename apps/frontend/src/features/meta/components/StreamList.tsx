"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Stream } from "../types";
import { StreamItem } from "./StreamItem";
import type { ParsedStreamDetails } from "@/lib/stream-parser";
import { Button } from "@/components/ui/button";

interface StreamListProps {
  streams: ParsedStreamDetails[] | undefined;
  rawStreams: Stream[] | undefined;
  isLoading: boolean;
  clearFilters: () => void;
  mediaTitle: string;
}

export function StreamList({
  streams,
  rawStreams,
  isLoading,
  clearFilters,
  mediaTitle,
}: StreamListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!streams || streams.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 p-4">
        <p className="text-muted-foreground text-center">
          No streaming sources found matching your criteria.
        </p>
        <Button variant="link" onClick={clearFilters} className="mt-2">
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {streams.map((parsed) => {
        const rawStream = rawStreams?.[parsed.originalIndex];
        if (!rawStream) return null;
        return (
          <StreamItem
            key={parsed.originalIndex}
            stream={rawStream}
            parsed={parsed}
            mediaTitle={mediaTitle}
          />
        );
      })}
    </div>
  );
}
