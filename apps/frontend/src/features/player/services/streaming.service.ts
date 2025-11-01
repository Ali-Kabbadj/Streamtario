import { APP_CONFIG } from "@/config/env";

/**
 * Checks if the local streaming service is running by pinging its health endpoint.
 * @returns {Promise<boolean>} A promise that resolves to true if the service is available, false otherwise.
 */
export async function checkStreamingServiceHealth(): Promise<boolean> {
    const healthCheckUrl = `${APP_CONFIG.NEXT_PUBLIC_STREAMING_SERVICE_URL}/health`;

    // We use an AbortController for a short timeout. If the server isn't running,
    // we don't want the user waiting for a long network timeout.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
        const response = await fetch(healthCheckUrl, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.ok && data.data?.status === 'ok';
        }

        return false;
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn("Streaming service health check failed:", error);
        return false;
    }
}