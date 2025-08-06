"use client";

import { useQuery } from "@tanstack/react-query";
import { useProfileContext } from "@/providers/profile-provider";
import { usePlayer } from "@/providers/PlayerProvider";
import { graphqlClient } from "@/lib/graphql-client";
import { GetContinueWatchingDocument } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

export const useContinueWatching = () => {
    const { selectedProfile } = useProfileContext();
    const { status: playerStatus } = usePlayer();
    const profileId = selectedProfile?.id ?? "";

    return useQuery({
        queryKey: ["continueWatching", profileId, playerStatus],
        queryFn: async () => {
            const data = await graphqlClient.request(GetContinueWatchingDocument, {
                profileId,
            });
            // This is the fix: we access the nested array and provide a
            // fallback of an empty array if it doesn't exist.
            return data.profile?.continueWatching ?? [];
        },
        enabled: !!profileId,
    });
};