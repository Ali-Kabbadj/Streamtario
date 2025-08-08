"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { UninstallAddonDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { DiscoverableCatalogsQuery, UninstallAddonMutation, UninstallAddonMutationVariables } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useUninstallAddon = (profileId: string) => {
    const queryClient = useQueryClient();

    return useMutation<UninstallAddonMutation, Error, UninstallAddonMutationVariables>({
        mutationFn: (variables) => graphqlClient.request(UninstallAddonDocument, variables),

        onSuccess: (data, variables) => {
            if (data.uninstallAddon.__typename === 'UninstallAddonError') {
                throw new Error(data.uninstallAddon.message);
            }
            const discoverQueryKey = ['discover', profileId];
            queryClient.setQueryData<DiscoverableCatalogsQuery>(discoverQueryKey, (oldData) => {
                if (!oldData?.profile?.discoverableCatalogs) {
                    return oldData;
                }
                const updatedCatalogs = oldData.profile.discoverableCatalogs.filter(
                    (catalog) => catalog.manifestId !== variables.manifestId
                );
                return {
                    ...oldData,
                    profile: {
                        ...oldData.profile,
                        discoverableCatalogs: updatedCatalogs,
                    },
                };
            });


            void queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
            void queryClient.invalidateQueries({ queryKey: discoverQueryKey });
            void queryClient.invalidateQueries({ queryKey: ['homeData', profileId] });

        },
    });
};