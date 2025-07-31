import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginWithCredentials } from "../services/auth.service";

type LoginCredentials = {
    email: string;
    password: string;
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, LoginCredentials>({
        mutationFn: loginWithCredentials,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["Account"] });
        },
    });
};