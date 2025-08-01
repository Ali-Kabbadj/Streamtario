import { useMutation } from "@tanstack/react-query";
import { loginWithCredentials } from "../services/auth.service";

type LoginCredentials = {
    email: string;
    password: string;
};

export const useLogin = () => {
    return useMutation<void, Error, LoginCredentials>({
        mutationFn: loginWithCredentials,
        onSuccess: () => {
            window.location.href = "/";
        },
    });
};