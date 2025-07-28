import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GET_FULL_PROFILE_QUERY } from '@/orchestrators/graphql-query-orchestrator/queries';

import {
    type GetFullProfileQuery,
    type GetFullProfileQueryVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useProfile = (profileId: string) => {
    return useQuery<GetFullProfileQuery, Error>({
        queryKey: ['profile', profileId],
        queryFn: async () => {
            return graphqlClient.request<GetFullProfileQuery, GetFullProfileQueryVariables>(GET_FULL_PROFILE_QUERY, { profileId });
        },
        enabled: !!profileId,
    });
};