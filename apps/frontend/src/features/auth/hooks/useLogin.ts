import { useMutation, useQueryClient } from '@tanstack/react-query';
import { APP_CONFIG } from '@/config/env';

type LoginCredentials = {
    email: string;
    password: string;
};

type TokenResponseType = {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
}

// The full API response envelope
type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    error?: { ui_message: string };
};

function handleSuccessfulLogin(tokens: TokenResponseType) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
}

async function loginUser(credentials: LoginCredentials): Promise<void> {
    const baseUrl = new URL(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL).origin;
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });

    const body: ApiResponse<TokenResponseType> = await response.json();

    if (body.ok && body.data) {
        // --- FIX: Pass the entire data object which is of TokenResponseType ---
        handleSuccessfulLogin(body.data);
    } else {
        const errorMessage = body.error?.ui_message || 'An unknown error occurred during login.';
        throw new Error(errorMessage);
    }
}

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, LoginCredentials>({
        mutationFn: loginUser,
        onSuccess: () => {
            // This part was already correct.
            // After tokens are stored, refetch account data.
            queryClient.invalidateQueries({ queryKey: ['myAccount'] });
        },
    });
};