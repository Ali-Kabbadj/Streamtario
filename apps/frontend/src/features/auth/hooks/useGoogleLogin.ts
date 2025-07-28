import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginWithGoogle } from "../services/auth.service";

/**
 * A mutation hook for handling the Google login process.
 * Takes the Google ID token as input.
 */
export const useGoogleLogin = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        // The mutation function is a clean call to our service layer.
        mutationFn: (token: string) => loginWithGoogle(token),
        onSuccess: async () => {
            // On success, invalidate the Account query to trigger a state update and redirect.
            await queryClient.invalidateQueries({ queryKey: ["Account"] });
        },

    });
};