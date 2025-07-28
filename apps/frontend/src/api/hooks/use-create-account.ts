import { useMutation } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CREATE_ACCOUNT_MUTATION } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CreateAccountMutationVariables } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useCreateAccount = () => {

    return useMutation({
        mutationFn: (variables: CreateAccountMutationVariables) =>
            graphqlClient.request(CREATE_ACCOUNT_MUTATION, variables),
        onSuccess: () => {
            console.log('Account created successfully!');
        },
    });
};