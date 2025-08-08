"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { UpdateAdvancedSettingsDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type {
    UpdateAdvancedSettingsMutation,
    UpdateAdvancedSettingsMutationVariables,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

export const useUpdateAdvancedSettings = (profileId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        UpdateAdvancedSettingsMutation,
        Error,
        UpdateAdvancedSettingsMutationVariables
    >({
        mutationFn: (variables) =>
            graphqlClient.request(UpdateAdvancedSettingsDocument, variables),
        onSuccess: (data) => {
            if (
                data.updateAdvancedSettings.__typename === "UpdateAdvancedSettingsSuccess"
            ) {
                void queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
            } else {
                const error = data.updateAdvancedSettings;
                throw new Error(error.message);
            }
        },
    });
};