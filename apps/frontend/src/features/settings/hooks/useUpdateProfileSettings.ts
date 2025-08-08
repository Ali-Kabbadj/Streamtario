"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { UpdateProfileSettingsDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type {
    UpdateProfileSettingsMutation,
    UpdateProfileSettingsMutationVariables,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

export const useUpdateProfileSettings = (profileId: string) => {
    const queryClient = useQueryClient();

    return useMutation<
        UpdateProfileSettingsMutation,
        Error,
        UpdateProfileSettingsMutationVariables
    >({
        mutationFn: (variables) =>
            graphqlClient.request(UpdateProfileSettingsDocument, variables),
        onSuccess: (data) => {
            if (
                data.updateProfileSettings.__typename === "UpdateProfileSettingsSuccess"
            ) {
                void queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
            } else {
                const error = data.updateProfileSettings;
                throw new Error(error.message);
            }
        },
    });
};