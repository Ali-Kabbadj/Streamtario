"use client";

import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { DiscoverableCatalogsDocument } from '@/orchestrators/graphql-query-orchestrator/queries';

export const useDiscover = (profileId: string) => {
    return useQuery({
        queryKey: ['discover', profileId],
        queryFn: async () => {
            const { profile } = await graphqlClient.request(DiscoverableCatalogsDocument, { profileId });
            return profile?.discoverableCatalogs ?? [];
        },
        enabled: !!profileId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};