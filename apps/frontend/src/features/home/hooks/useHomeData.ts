"use client";

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { useDiscover } from '@/features/discover/hooks/useDiscover';
import { CatalogDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CatalogQuery, DiscoverableCatalogsQuery } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

type Catalog = DiscoverableCatalogsQuery['profile']['discoverableCatalogs'][0];

// Heuristic to find the "most popular" or default catalog
const isDefaultCatalog = (catalog: Catalog) => {
    const name = catalog.catalogName.toLowerCase();
    return name.includes('popular') || name.includes('top') || name.includes('trending');
};

/**
 * A complex hook that orchestrates fetching all the data needed for the Board page.
 */
export const useHomeData = (profileId: string) => {
    // 1. First, get the metadata for all available catalogs.
    const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(profileId);

    // 2. From the metadata, determine which catalogs we need to fetch content for.
    const queriesToRun = useMemo(() => {
        if (!discoverData) return [];

        const catalogsToFetch = new Map<string, Catalog>();

        // Group by addon and content type
        const grouped = new Map<string, Map<string, Catalog[]>>();
        discoverData.forEach(catalog => {
            if (!grouped.has(catalog.addonName)) {
                grouped.set(catalog.addonName, new Map());
            }
            const addonGroup = grouped.get(catalog.addonName)!;
            if (!addonGroup.has(catalog.catalogType)) {
                addonGroup.set(catalog.catalogType, []);
            }
            addonGroup.get(catalog.catalogType)!.push(catalog);
        });

        // For each group, find the "default" catalog
        grouped.forEach((addonGroup) => {
            addonGroup.forEach((catalogs) => {
                const defaultCatalog = catalogs.find(isDefaultCatalog) || catalogs[0];
                if (defaultCatalog) {
                    catalogsToFetch.set(`${defaultCatalog.manifestId}-${defaultCatalog.catalogType}`, defaultCatalog);
                }
            });
        });

        // 3. Create a query configuration for each catalog we need to fetch.
        return Array.from(catalogsToFetch.values()).map(catalog => ({
            queryKey: ['catalog', profileId, catalog.catalogType, catalog.catalogId],
            queryFn: async () => {
                const data = await graphqlClient.request(CatalogDocument, {
                    profileId,
                    itemType: catalog.catalogType,
                    catalogId: catalog.catalogId,
                });
                // Attach the original catalog metadata to the result for easy grouping later
                return { ...data.profile?.catalog, metadata: catalog };
            },
            enabled: !!profileId,
        }));
    }, [discoverData, profileId]);

    // 4. Run all queries in parallel using `useQueries`.
    const queryResults = useQueries({ queries: queriesToRun });

    // 5. Process the results into a clean data structure for the UI.
    const boardData = useMemo(() => {
        const dataByAddon = new Map<string, { addonName: string; types: Map<string, any[]> }>();

        queryResults.forEach(result => {
            if (result.isSuccess && result.data?.items) {
                const { metadata, items } = result.data;
                if (!dataByAddon.has(metadata.addonName)) {
                    dataByAddon.set(metadata.addonName, { addonName: metadata.addonName, types: new Map() });
                }
                const addonData = dataByAddon.get(metadata.addonName)!;
                addonData.types.set(metadata.catalogType, items);
            }
        });

        return Array.from(dataByAddon.values());
    }, [queryResults]);

    const isLoading = isLoadingDiscover || queryResults.some(q => q.isLoading);

    return { boardData, isLoading };
};