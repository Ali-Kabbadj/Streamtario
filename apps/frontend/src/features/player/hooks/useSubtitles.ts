import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GetSubtitlesDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import { useProfileContext } from '@/providers/profile-provider';

interface UseSubtitlesProps {
    contentId?: string;
    itemType?: string;
    filename?: string;
    videoSize?: number;
    videoHash?: string | null;
    enabled?: boolean;
}

export const useSubtitles = ({ contentId, itemType, filename, videoSize, videoHash, enabled = true }: UseSubtitlesProps) => {
    const { selectedProfile } = useProfileContext();
    const profileId = selectedProfile?.id ?? "";

    const isQueryReady = !!(profileId && contentId && itemType && filename && videoHash && videoSize !== undefined);

    return useQuery({
        queryKey: ['subtitles', profileId, contentId, filename, videoHash],
        queryFn: async () => {
            const data = await graphqlClient.request(GetSubtitlesDocument, {
                profileId,
                itemType: itemType!,
                contentId: contentId!,
                filename: filename!,
                videoSize: String(videoSize!),
                videoHash: videoHash!,
            });
            return data.profile?.subtitles ?? [];
        },
        enabled: enabled && isQueryReady,
    });
};