import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginWithCredentials } from "../services/auth.service"; // <-- IMPORT

type LoginCredentials = {
    email: string;
    password: string;
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, LoginCredentials>({
        // The mutation function is now just a call to our clean service layer.
        mutationFn: loginWithCredentials,
        onSuccess: async () => {
            // On success, invalidate the account query to trigger a state update.
            await queryClient.invalidateQueries({ queryKey: ["Account"] });
        },
    });
};