import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GetStreamsDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { StreamType } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

interface UseStreamsProps {
    profileId: string;
    itemId: string;
    itemType: string;
    enabled?: boolean;
}

export const useStreams = ({ profileId, itemId, itemType, enabled = true }: UseStreamsProps) => {
    return useQuery<Array<StreamType>>({
        queryKey: ['streams', profileId, itemType, itemId],
        queryFn: async () => {
            const data = await graphqlClient.request(GetStreamsDocument, {
                profileId,
                itemType,
                itemId,
            });
            return data.profile?.streams ?? [];
        },
        enabled: !!profileId && !!itemId && !!itemType && enabled,
    });
};