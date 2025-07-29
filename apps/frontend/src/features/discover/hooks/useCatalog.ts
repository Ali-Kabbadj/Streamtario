"use client";

import { useInfiniteQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CatalogDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CatalogItemType } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

// A page of content will have a list of items and the skip value for the next page.
interface CatalogPage {
  items: CatalogItemType[];
  nextSkip: number | null;
}

interface UseCatalogProps {
  profileId: string;
  itemType: string;
  catalogId: string;
  providerId?: string;
  extraProps: Record<string, unknown>; // For dynamic filters like genre, year, etc.
  isEnabled: boolean; // Control when the query runs
}

const PAGE_SIZE = 20; // How many items to fetch per page

/**
 * Fetches paginated content for a selected catalog, including dynamic extra properties.
 */
export const useCatalog = ({ profileId, itemType, catalogId, providerId, extraProps, isEnabled }: UseCatalogProps) => {
  return useInfiniteQuery<CatalogPage, Error>({
    queryKey: ['catalog', profileId, itemType, catalogId, providerId, extraProps],
    queryFn: async ({ pageParam = 0 }) => {
      const skip = pageParam as number;

      const variables = {
        profileId,
        itemType,
        catalogId,
        manifestId: providerId,
        extraProps: {
          ...extraProps,
          skip: skip, // Add the skip value for pagination
        },
      };

      const data = await graphqlClient.request(CatalogDocument, variables);
      const items = data.profile?.catalog.items ?? [];

      return {
        items,
        // If we received a full page of items, there might be a next page.
        nextSkip: items.length === PAGE_SIZE ? skip + PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    // The `getNextPageParam` function tells React Query how to get the 'skip' value for the next page.
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    // `enabled` flag ensures we don't fetch data until all required filters are selected.
    enabled: isEnabled,
  });
};