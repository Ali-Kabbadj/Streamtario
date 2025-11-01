"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StreamItem } from "./StreamItem";
import type { ParsedStreamDetails, Stream } from "@/lib/stream-parser";
import { Button } from "@/components/ui/button";
import type {
  GetPlaybackHistoryByImdbIdQuery,
  MetaItemType,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { useMemo } from "react";

type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];

interface StreamListProps {
  streams: ParsedStreamDetails[] | undefined;
  rawStreams: Stream[] | undefined;
  isLoading: boolean;
  clearFilters: () => void;
  mediaTitle: string;
  contentId: string;
  meta: MetaItemType;
  playbackHistory?: PlaybackHistoryItem;
}

export function StreamList({
  streams,
  rawStreams,
  isLoading,
  clearFilters,
  mediaTitle,
  contentId,
  meta,
  playbackHistory,
}: StreamListProps) {
  const sortedStreams = useMemo(() => {
    if (!streams || !rawStreams) return [];
    const lastPlayedStreamId = playbackHistory?.lastStreamDetails?.infoHash;
    if (!lastPlayedStreamId) {
      return streams;
    }
    return [...streams].sort((a, b) => {
      const streamA_Id = rawStreams[a.originalIndex]?.infoHash;
      const streamB_Id = rawStreams[b.originalIndex]?.infoHash;
      if (streamA_Id === lastPlayedStreamId) return -1;
      if (streamB_Id === lastPlayedStreamId) return 1;
      return 0;
    });
  }, [streams, rawStreams, playbackHistory]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!sortedStreams || sortedStreams.length === 0) {
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

  const lastPlayedStreamId = playbackHistory?.lastStreamDetails?.infoHash;

  return (
    <div className="space-y-3">
      {sortedStreams.map((parsed) => {
        const rawStream = rawStreams?.[parsed.originalIndex];
        if (!rawStream) return null;

        const isLastPlayedStream =
          !!lastPlayedStreamId && rawStream.infoHash === lastPlayedStreamId;

        return (
          <StreamItem
            key={parsed.originalIndex}
            stream={rawStream}
            parsed={parsed}
            mediaTitle={mediaTitle}
            contentId={contentId}
            meta={meta}
            // --- THE FIX ---
            // Pass the entire history object to ALL items
            playbackHistory={playbackHistory}
            // Pass a boolean to control the UI/logic for the specific last-played stream
            isLastPlayedStream={isLastPlayedStream}
          />
        );
      })}
    </div>
  );
}
