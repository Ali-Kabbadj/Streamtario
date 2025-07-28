import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CREATE_PROFILE_MUTATION } from '@/orchestrators/graphql-query-orchestrator/queries';
import type {
    CreateProfileMutation,
    CreateProfileMutationVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useCreateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation<CreateProfileMutation, Error, CreateProfileMutationVariables>({
        mutationFn: (variables) => graphqlClient.request(CREATE_PROFILE_MUTATION, variables),

        onSuccess: (data) => {
            if (data.createProfile.__typename === 'CreateProfileSuccess') {
                void queryClient.invalidateQueries({ queryKey: ['Account'] });
            } else {
                const error = data.createProfile;
                throw new Error(error.message);
            }
        },
    });
};