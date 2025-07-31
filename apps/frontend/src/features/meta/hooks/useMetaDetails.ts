import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GetMetaDetailsDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { GetMetaDetailsQuery, GetMetaDetailsQueryVariables, MetaItemType } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

interface UseMetaDetailsProps {
    profileId: string;
    itemId: string;
    itemType: string;
}

export const useMetaDetails = ({ profileId, itemId, itemType }: UseMetaDetailsProps) => {
    return useQuery<GetMetaDetailsQuery, Error, MetaItemType | null>({
        queryKey: ['metaDetails', profileId, itemType, itemId],
        queryFn: async () => {
            return graphqlClient.request<GetMetaDetailsQuery, GetMetaDetailsQueryVariables>(GetMetaDetailsDocument, {
                profileId,
                itemType,
                itemId,
            });
        },
        select: (data) => {
            if (!data.profile) {
                return null;
            }
            return data.profile.meta ?? null;
        },
        enabled: !!profileId && !!itemId && !!itemType,
    });
};