type EnvVars = {
    NEXT_PUBLIC_API_GATEWAY_URL: string;
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
    NEXT_PUBLIC_STREAMING_SERVICE_URL: string;
};

export function getEnv(): EnvVars {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const streamingServiceUrl = process.env.NEXT_PUBLIC_STREAMING_SERVICE_URL;

    if (!gatewayUrl) {
        throw new Error(
            "ERROR: NEXT_PUBLIC_API_GATEWAY_URL is not defined in the environment.",
        );
    }
    if (!googleClientId) {
        throw new Error(
            "ERROR: NEXT_PUBLIC_GOOGLE_CLIENT_ID is not defined in the environment.",
        );
    }
    if (!streamingServiceUrl) { 
        throw new Error(
            "ERROR: NEXT_PUBLIC_STREAMING_SERVICE_URL is not defined in the environment.",
        );
    }

    return {
        NEXT_PUBLIC_API_GATEWAY_URL: gatewayUrl,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
        NEXT_PUBLIC_STREAMING_SERVICE_URL: streamingServiceUrl,
    };
}

export const APP_CONFIG = getEnv();