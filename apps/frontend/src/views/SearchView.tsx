"use client";

import { useProfileContext } from "@/providers/profile-provider";
import { useSearch } from "@/features/search/hooks/useSearch";
import { AddonSearchResultSection } from "@/features/search/components/AddonSearchResultSection";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchViewProps {
  query: string;
}

export function SearchView({ query }: SearchViewProps) {
  const { selectedProfile } = useProfileContext();

  const { results, isLoading, error } = useSearch(
    selectedProfile?.id ?? "",
    query,
  );

  const renderSkeletons = () => (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-64 w-48 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto space-y-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Search results for {query}
      </h1>

      {isLoading && results.length === 0 && renderSkeletons()}

      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && results.length === 0 && query.length > 2 && (
        <p>No results found for your search.</p>
      )}

      {results.map((addonResult) => (
        <AddonSearchResultSection
          key={addonResult.addonName}
          data={addonResult}
        />
      ))}
    </div>
  );
}
