// src/api/hooks/use-create-account.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { CREATE_ACCOUNT_MUTATION } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CreateAccountMutationVariables } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useCreateAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: CreateAccountMutationVariables) =>
            graphqlClient.request(CREATE_ACCOUNT_MUTATION, variables),
        onSuccess: () => {
            // Example of invalidating queries on success, e.g., to refetch a list of users.
            // queryClient.invalidateQueries({ queryKey: ['users'] });
            console.log('Account created successfully!');
        },
    });
};