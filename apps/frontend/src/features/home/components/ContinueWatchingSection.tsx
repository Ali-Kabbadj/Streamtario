"use client";

import { useContinueWatching } from "../hooks/useuseContinueWatching";
import { ContinueWatchingCard } from "./ContinueWatchingCard";
import { Skeleton } from "@/components/ui/skeleton";

export function ContinueWatchingSection() {
  const { data, isLoading, isSuccess } = useContinueWatching();

  const hasContent = isSuccess && data && data.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="w-48 flex-shrink-0">
              <Skeleton className="h-[270px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasContent) {
    // Render nothing if there's no history to show
    return null;
  }

  return (
    <div>
      {/* <h2 className="mb-4 pr-4 text-3xl font-bold tracking-tight">
        Continue Watching
      </h2> */}
      <div className="flex space-x-4 overflow-x-auto py-4 pt-4 pr-4 pb-2 pl-2">
        {data.map((item) => (
          <div key={item.contentId} className="w-48 flex-shrink-0">
            <ContinueWatchingCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
