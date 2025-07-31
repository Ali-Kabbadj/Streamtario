"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { StreamItem } from "./StreamItem";
import type { ParsedStreamDetails } from "@/lib/stream-parser";
import { useView } from "@/providers/view-provider";
import { Button } from "@/components/ui/button";

interface StreamListProps {
  streams: ParsedStreamDetails[] | undefined;
  rawStreams: GetStreamsQuery["profile"]["streams"] | undefined;
  isLoading: boolean;
}

export function StreamList({
  streams,
  rawStreams,
  isLoading,
}: StreamListProps) {
  const { navigateTo } = useView();
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!streams || streams.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
        <p className="text-muted-foreground text-center">
          No streaming sources found. Please make use you have installed a
          streaming{" "}
          <Button onClick={() => navigateTo({ name: "addons" })}>Addons</Button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {streams.map((parsed, index) => {
        const rawStream = rawStreams?.[index];
        if (!rawStream) return null;
        return <StreamItem key={index} stream={rawStream} parsed={parsed} />;
      })}
    </div>
  );
}
