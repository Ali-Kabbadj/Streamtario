"use client";

import { useInfiniteQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CatalogDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CatalogItemType, CatalogQuery } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

interface CatalogPage {
  items: CatalogItemType[];
}

interface UseCatalogProps {
  profileId: string;
  itemType: string;
  catalogId: string;
  providerId?: string;
  extraProps: Record<string, unknown>;
  isEnabled: boolean;
}

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

      const data: CatalogQuery = await graphqlClient.request(CatalogDocument, variables);
      const items = data.profile?.catalog.items ?? [];

      return { items };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length === 0) {
        return null;
      }
      const pageSize = allPages[0]?.items.length ?? 0;
      if (pageSize === 0) {
        return null;
      }

      if (lastPage.items.length < pageSize) {
        return null;
      }
      if (allPages.length > 1) {
        const allItems = allPages.flatMap(page => page.items);
        const uniqueItems = new Set(allItems.map(item => item.id));

        const previousItems = allPages.slice(0, -1).flatMap(page => page.items);
        const previousUniqueItems = new Set(previousItems.map(item => item.id));

        if (uniqueItems.size === previousUniqueItems.size) {
          return null;
        }
      }
      return (allPages.length + 1) * pageSize;
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
  ;