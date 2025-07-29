"use client";

import { useInfiniteQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CatalogDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CatalogItemType } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

interface CatalogPage {
  items: CatalogItemType[];
  nextSkip: number | null;
}

interface UseCatalogProps {
  profileId: string;
  itemType: string;
  catalogId: string;
  providerId?: string;
  extraProps: Record<string, unknown>;
  isEnabled: boolean;
}

const PAGE_SIZE = 20;

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
          skip: skip,
        },
      };

      const data = await graphqlClient.request(CatalogDocument, variables);
      const items = data.profile?.catalog.items ?? [];

      return {
        items,
        nextSkip: items.length >= PAGE_SIZE ? skip + PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    enabled: isEnabled,
  });
};