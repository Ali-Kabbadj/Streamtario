type EnvVars = {
    NEXT_PUBLIC_API_GATEWAY_URL: string;
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
    NEXT_PUBLIC_TORRSERVER_URL: string;
    NEXT_PUBLIC_TORRSERVER_WS_URL: string;
};

export function getEnv(): EnvVars {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const torrserverUrl = process.env.NEXT_PUBLIC_TORRSERVER_URL;
    const torrserverWsUrl = process.env.NEXT_PUBLIC_TORRSERVER_WS_URL;

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
    if (!torrserverUrl) {
        throw new Error(
            "ERROR: NEXT_PUBLIC_TORRSERVER_URL is not defined in the environment.",
        );
    }
    if (!torrserverWsUrl) {
        throw new Error(
            "ERROR: NEXT_PUBLIC_TORRSERVER_WS_URL is not defined in the environment.",
        );
    }

    return {
        NEXT_PUBLIC_API_GATEWAY_URL: gatewayUrl,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleClientId,
        NEXT_PUBLIC_TORRSERVER_URL: torrserverUrl,
        NEXT_PUBLIC_TORRSERVER_WS_URL: torrserverWsUrl,
    };
}

export const APP_CONFIG = getEnv();