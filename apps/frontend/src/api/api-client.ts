import { APP_CONFIG } from "@/config/env";

// A generic type for API responses
type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    error?: { ui_message: string };
};

// A generic fetch client to handle API requests
export async function fetchClient<T>(
    endpoint: string,
    options: RequestInit = {},
    errorMessage = "An unknown error occurred.",
): Promise<T> {
    const baseUrl = new URL(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL).origin;
    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const body = (await response.json()) as ApiResponse<T>;

    if (body.ok && body.data) {
        return body.data;
    } else {
        throw new Error(body.error?.ui_message ?? errorMessage);
    }
}