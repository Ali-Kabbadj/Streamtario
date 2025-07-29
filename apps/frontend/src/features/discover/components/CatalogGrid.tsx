"use client";

import { useEffect } from "react";
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
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderSkeletons = () =>
    Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="flex flex-col space-y-3">
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    ));

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {renderSkeletons()}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {pages?.map((page) =>
          page.map((item) => <CatalogItemCard key={item.id} item={item} />),
        )}
      </div>

      {/* This invisible element triggers the next page fetch when it comes into view */}
      <div ref={ref} className="h-10" />

      {isFetchingNextPage && (
        <p className="mt-4 text-center">Loading more...</p>
      )}

      {!hasNextPage && !isLoading && (
        <p className="mt-4 text-center text-slate-400">
          You&apos;ve reached the end.
        </p>
      )}
    </div>
  );
}
