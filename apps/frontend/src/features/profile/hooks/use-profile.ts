import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GetFullProfileDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import {
    type GetFullProfileQuery,
    type GetFullProfileQueryVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useProfile = (profileId: string) => {
    return useQuery<GetFullProfileQuery, Error>({
        queryKey: ['profile', profileId],
        queryFn: async () => {
            return graphqlClient.request<GetFullProfileQuery, GetFullProfileQueryVariables>(GetFullProfileDocument, { profileId });
        },
        enabled: !!profileId,
    });
};