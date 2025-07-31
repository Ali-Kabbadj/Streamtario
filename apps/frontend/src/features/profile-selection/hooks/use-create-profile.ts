import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CreateProfileDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type {
    CreateProfileMutation,
    CreateProfileMutationVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useCreateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation<CreateProfileMutation, Error, CreateProfileMutationVariables>({
        mutationFn: (variables) => graphqlClient.request(CreateProfileDocument, variables),

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