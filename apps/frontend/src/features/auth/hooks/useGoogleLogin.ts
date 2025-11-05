import { useMutation } from "@tanstack/react-query";
import { loginWithGoogle, type GoogleLoginPayload } from "../services/auth.service";

export const useGoogleLogin = () => {
    return useMutation<void, Error, GoogleLoginPayload>({
        mutationFn: (payload: GoogleLoginPayload) => loginWithGoogle(payload),
        onSuccess: () => {
            window.location.reload();
        },
    });
};