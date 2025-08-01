import { useMutation } from "@tanstack/react-query";
import { loginWithGoogle } from "../services/auth.service";

export const useGoogleLogin = () => {
    return useMutation<void, Error, string>({
        mutationFn: (code: string) => loginWithGoogle(code),
        onSuccess: () => {
            window.location.href = "/";
        },
    });
};