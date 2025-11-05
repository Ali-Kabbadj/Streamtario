import { fetchClient, ClientError } from "@/api/api-client";
import { isWebView } from "@/features/player/hooks/useMpvPlayer";

type LoginCredentials = {
    email: string;
    password: string;
};

type TokenResponseType = {
    accessToken: string;
    refreshToken: string;
};

export type GoogleLoginPayload = {
    code: string;
    redirectUri?: string;
};

function persistTokens(tokens: TokenResponseType): void {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
}

export async function loginWithCredentials(
    credentials: LoginCredentials,
): Promise<void> {
    const tokens = await fetchClient<TokenResponseType>(
        "/api/v1/auth/login",
        {
            method: "POST",
            body: JSON.stringify(credentials),
        },
        "The email or password you entered is incorrect.",
    );
    persistTokens(tokens);
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<void> {
    try {
        const endpoint = "/api/v1/auth/google/login";

        const finalPayload: { code: string; redirect_uri?: string } = { code: payload.code };

        if (isWebView() && payload.redirectUri) {
            finalPayload.redirect_uri = payload.redirectUri;
        }

        const tokens = await fetchClient<TokenResponseType>(
            endpoint,
            {
                method: "POST",
                body: JSON.stringify(finalPayload),
            },
            "An unknown error occurred during Google login.",
        );
        persistTokens(tokens);
    } catch (error) {
        if (error instanceof ClientError && error.errorData.type === 'ACCOUNT_EMAIL_IN_USE_BY_SOCIAL') {
            throw new Error(error.errorData.ui_message);
        }
        throw error;
    }
}


export async function refreshSession(): Promise<void> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        throw new Error("No refresh token available.");
    }

    try {
        const tokens = await fetchClient<TokenResponseType>(
            "/api/v1/auth/refresh",
            {
                method: "POST",
                body: JSON.stringify({ refresh_token: refreshToken }),
            },
            "Your session has expired. Please log in again.",
        );
        persistTokens(tokens);
    } catch (error) {
        console.error("Failed to refresh session:", error);
        throw error;
    }
}