type EnvVars = {
    NEXT_PUBLIC_API_GATEWAY_URL: string;
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
};

export function getEnv(): EnvVars {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

    return {
        NEXT_PUBLIC_API_GATEWAY_URL: gatewayUrl,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
    };
}

export const APP_CONFIG = getEnv();