"use client";

import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { HomeCatalogsDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { HomeCatalogsQuery } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useHomeData = (profileId: string) => {
    return useQuery<HomeCatalogsQuery>({
        queryKey: ['homeData', profileId],
        queryFn: async () => {
            return graphqlClient.request(HomeCatalogsDocument, { profileId });
        },
        enabled: !!profileId,
    });
};