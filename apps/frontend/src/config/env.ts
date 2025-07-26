
type EnvVars = {
    NEXT_PUBLIC_API_GATEWAY_URL: string;
}

export function getEnv(): EnvVars {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

    if (!gatewayUrl) {
        throw new Error(
            "ERROR: NEXT_PUBLIC_ACCOUNT_PROFILE_SERVICE_URL is not defined in the environment."
        );
    }

    return {
        NEXT_PUBLIC_API_GATEWAY_URL: gatewayUrl,
    };
}

export const APP_CONFIG = getEnv();