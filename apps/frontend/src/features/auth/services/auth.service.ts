import { fetchClient } from "@/api/api-client";

// Define clear types for what our service functions need and return.
type LoginCredentials = {
    email: string;
    password: string;
};

type TokenResponseType = {
    accessToken: string;
    refreshToken: string;
};

/**
 * Stores tokens in localStorage after a successful login or refresh.
 */
function persistTokens(tokens: TokenResponseType): void {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
}

/**
 * Handles the login request to the auth-service.
 * @throws An error with a user-friendly message on failure.
 */
export async function loginWithCredentials(
    credentials: LoginCredentials,
): Promise<void> {
    const tokens = await fetchClient<TokenResponseType>(
        "/api/v1/auth/login",
        {
            method: "POST",
            body: JSON.stringify(credentials),
        },
        "An unknown error occurred.",
    );
    persistTokens(tokens);
}

/**
 * Sends the Google ID token to the backend for validation and session creation.
 * @param token The ID token received from Google Sign-In.
 * @throws An error with a user-friendly message on failure.
 */
export async function loginWithGoogle(token: string): Promise<void> {
    try {
        const tokens = await fetchClient<TokenResponseType>(
            "/api/v1/auth/google/login",
            {
                method: "POST",
                body: JSON.stringify({ token }),
            },
            "An unknown Google login error occurred.",
        );
        persistTokens(tokens);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.includes("email address already exists")
        ) {
            throw new Error(
                "This email is registered with a password. Please log in with your password.",
            );
        }
        throw error; // Re-throw the original error if it's not the specific case we're handling.
    }
}

/**
 * Handles the token refresh request to the auth-service.
 * @throws An error if the refresh token is missing or the request fails.
 */
export async function refreshSession(): Promise<void> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        throw new Error("No refresh token available.");
    }

    const tokens = await fetchClient<TokenResponseType>(
        "/api/v1/auth/refresh",
        {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
        },
        "Session expired.",
    );
    persistTokens(tokens);
}