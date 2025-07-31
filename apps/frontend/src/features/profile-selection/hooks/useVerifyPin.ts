import { useMutation } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { VerifyProfilePinDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type {
    VerifyProfilePinMutation,
    VerifyProfilePinMutationVariables,
} from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

/**
 * A mutation hook for verifying a profile's PIN.
 * @throws An error with the backend's message on failure.
 */
export const useVerifyPin = () => {
    return useMutation<
        VerifyProfilePinMutation,
        Error,
        VerifyProfilePinMutationVariables
    >({
        mutationFn: async (variables) => {
            // --- FIX: Use the correctly named DocumentNode ---
            const result = await graphqlClient.request(
                VerifyProfilePinDocument,
                variables,
            );

            // Check the response and throw an error if the PIN was incorrect.
            // This ensures the mutation's `isError` state is correctly set.
            if (result.verifyProfilePin.__typename === 'VerifyProfilePinError') {
                throw new Error(result.verifyProfilePin.message);
            }

            return result;
        },
    });
};