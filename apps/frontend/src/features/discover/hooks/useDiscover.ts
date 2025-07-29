"use client";

import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
// --- THIS IS THE FIX: Import the document from the central queries file ---
import { DiscoverableCatalogsDocument } from '@/orchestrators/graphql-query-orchestrator/queries';

/**
 * Fetches the metadata for all available catalogs for a given profile.
 * This data is used to populate the filter dropdowns on the discover page.
 */
export const useDiscover = (profileId: string) => {
    return useQuery({
        queryKey: ['discover', profileId],
        queryFn: async () => {
            const { profile } = await graphqlClient.request(DiscoverableCatalogsDocument, { profileId });
            return profile?.discoverableCatalogs ?? [];
        },
        enabled: !!profileId, // Only run the query if a profileId is provided.
    });
};