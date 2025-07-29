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

export function CatalogGrid({
  pages,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: CatalogGridProps) {
  const { ref, inView } = useInView({
    rootMargin: "800px 0px",
    triggerOnce: false,
  });

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
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    ));

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {renderSkeletons(12)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {allItems.map((item) => (
          <CatalogItemCard key={item.id} item={item} />
        ))}
        {isFetchingNextPage && renderSkeletons(6)}
      </div>

      <div ref={ref} className="h-1" />

      {!hasNextPage && !isLoading && allItems.length > 0 && (
        <p className="mt-4 text-center text-slate-400">
          You&apos;ve reached the end.
        </p>
      )}
    </div>
  );
}
