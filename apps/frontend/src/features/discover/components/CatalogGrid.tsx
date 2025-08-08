"use client";

import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { CatalogItemCard } from "@/components/features/discover/CatalogItemCard";

type CatalogItem = NonNullable<CatalogQuery["profile"]>["catalog"]["items"][0];

interface CatalogGridProps {
  pages: CatalogItem[][] | undefined;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
}

const PREFETCH_THRESHOLD = 8;

export function CatalogGrid({
  pages,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: CatalogGridProps) {
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = useMemo(() => {
    if (!pages) return [];
    const flatItems = pages.flat();
    const uniqueItems = new Map<string, CatalogItem>();
    for (const item of flatItems) {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    }
    return Array.from(uniqueItems.values());
  }, [pages]);

  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <div key={`skeleton-${i}`} className="flex flex-col space-y-3">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    ));

  const gridClassName =
    "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4";

  if (isLoading) {
    return <div className={gridClassName}>{renderSkeletons(12)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className={gridClassName}>
        {allItems.map((item, index) => {
          const isPrefetchTrigger =
            allItems.length > PREFETCH_THRESHOLD &&
            index === allItems.length - PREFETCH_THRESHOLD;

          return (
            <CatalogItemCard
              key={item.id}
              item={item}
              ref={isPrefetchTrigger ? ref : null}
            />
          );
        })}
        {isFetchingNextPage && renderSkeletons(10)}
      </div>

      {!hasNextPage && !isLoading && allItems.length > 0 && (
        <p className="mt-4 text-center text-slate-400">
          You&apos;ve reached the end.
        </p>
      )}
    </div>
  );
}
