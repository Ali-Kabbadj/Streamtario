import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginWithGoogle } from "../services/auth.service";

export const useGoogleLogin = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (code: string) => loginWithGoogle(code),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["Account"] });
        },

    });
};