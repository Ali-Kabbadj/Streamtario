"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { InstallAddonDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { InstallAddonMutation, InstallAddonMutationVariables } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useInstallAddon = (profileId: string) => {
    const queryClient = useQueryClient();

    return useMutation<InstallAddonMutation, Error, InstallAddonMutationVariables>({
        mutationFn: (variables) => graphqlClient.request(InstallAddonDocument, variables),
        onSuccess: (data) => {
            if (data.installAddon.__typename === 'InstallAddonError') {
                throw new Error(data.installAddon.message);
            }
            void queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
            void queryClient.invalidateQueries({ queryKey: ['discover', profileId] });
            void queryClient.invalidateQueries({ queryKey: ['homeData', profileId] });
        },
    });
};