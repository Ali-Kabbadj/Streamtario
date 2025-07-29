"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { UninstallAddonDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { UninstallAddonMutation, UninstallAddonMutationVariables } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useUninstallAddon = (profileId: string) => {
    const queryClient = useQueryClient();

    return useMutation<UninstallAddonMutation, Error, UninstallAddonMutationVariables>({
        mutationFn: (variables) => graphqlClient.request(UninstallAddonDocument, variables),
        onSuccess: (data) => {
            if (data.uninstallAddon.__typename === 'UninstallAddonError') {
                throw new Error(data.uninstallAddon.message);
            }
            // When an uninstall succeeds, invalidate the profile query
            // to refetch the list of installed addons.
            void queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
        },
    });
};