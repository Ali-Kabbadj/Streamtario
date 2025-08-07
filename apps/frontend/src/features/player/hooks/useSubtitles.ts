import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { GetSubtitlesDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import { useProfileContext } from '@/providers/profile-provider';

interface UseSubtitlesProps {
    contentId?: string;
    itemType?: string;
    filename?: string;
    videoSize?: number;
    videoHash?: string;
}

export const useSubtitles = ({ contentId, itemType, filename, videoSize, videoHash }: UseSubtitlesProps) => {
    const { selectedProfile } = useProfileContext();
    const profileId = selectedProfile?.id ?? "";

    return useQuery({
        queryKey: ['subtitles', profileId, contentId, filename, videoHash],
        queryFn: async () => {
            // This function will only be executed when refetch is called with all variables present.
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
        // The query is disabled by default and will ONLY run when we manually call refetch.
        enabled: false,
    });
};