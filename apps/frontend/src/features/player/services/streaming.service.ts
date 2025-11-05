import { APP_CONFIG } from "@/config/env";

export async function checkStreamingServiceHealth(): Promise<boolean> {
    const healthCheckUrl = `${APP_CONFIG.NEXT_PUBLIC_TORRSERVER_URL}/health`;
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
            return data?.data?.status === 'ok';
        }

        return false;
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn("TorrServer daemon health check failed:", error);
        return false;
    }
}