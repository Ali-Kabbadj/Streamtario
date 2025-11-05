import { useMutation } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { VerifyProfilePinDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type {
    VerifyProfilePinMutation,
    VerifyProfilePinMutationVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

export const useVerifyPin = () => {
    return useMutation<
        VerifyProfilePinMutation,
        Error,
        VerifyProfilePinMutationVariables
    >({
        mutationFn: async (variables) => {
            const result = await graphqlClient.request(
                VerifyProfilePinDocument,
                variables,
            );

            if (result.verifyProfilePin.__typename === 'VerifyProfilePinError') {
                throw new Error(result.verifyProfilePin.message);
            }

            return result;
        },
    });
};