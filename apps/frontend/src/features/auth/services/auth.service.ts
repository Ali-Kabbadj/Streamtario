import { fetchClient, ClientError } from "@/api/api-client";

type LoginCredentials = {
    email: string;
    password: string;
};

type TokenResponseType = {
    accessToken: string;
    refreshToken: string;
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

export async function loginWithGoogle(code: string): Promise<void> {
    try {
        const tokens = await fetchClient<TokenResponseType>(
            "/api/v1/auth/google/login",
            {
                method: "POST",
                body: JSON.stringify({ code }),
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
        throw new Error("Could not refresh session.");
    }
}