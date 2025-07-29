import { APP_CONFIG } from "@/config/env";

type ApiError = {
    type: string;
    dev_message: string;
    ui_message: string;
    details?: unknown;
};

type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    error?: ApiError;
};

export class ClientError extends Error {
    public readonly errorData: ApiError;

    constructor(errorData: ApiError) {
        super(errorData.ui_message);
        this.name = "ClientError";
        this.errorData = errorData;
    }
}

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
        const errorDetail = body.error ?? {
            type: "UNKNOWN_CLIENT_ERROR",
            dev_message: "The API response was not 'ok' but contained no error body.",
            ui_message: errorMessage,
        };
        console.error("API Client Error:", {
            endpoint: endpoint,
            ...errorDetail,
        });
        throw new ClientError(errorDetail);
    }
}