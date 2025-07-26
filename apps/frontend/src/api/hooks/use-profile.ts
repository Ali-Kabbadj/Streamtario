// src/api/hooks/use-profile.ts
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_FULL_PROFILE_QUERY } from '@/orchestrators/graphql-query-orchestrator/queries';

import {
    type GetFullProfileQuery,
    type GetFullProfileQueryVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql'; // ✅ Point to the new `gen` subdirectory

export const useProfile = (profileId: string) => {
    return useQuery<GetFullProfileQuery, Error>({ // No need for the third type argument here
        queryKey: ['profile', profileId],
        queryFn: async () => {
            return graphqlClient.request<GetFullProfileQuery, GetFullProfileQueryVariables>(GET_FULL_PROFILE_QUERY, { profileId });
        },
        enabled: !!profileId,
    });
};