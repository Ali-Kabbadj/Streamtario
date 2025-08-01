import { useState, useEffect, useCallback, useRef } from "react";
import { type WebViewCommand } from "@/types/webview/commands";
import { type MpvEvent } from "@/types/webview/events";
import { APP_CONFIG } from "@/config/env";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = GetStreamsQuery["profile"]["streams"][0];

const isWebView = () => typeof window !== "undefined" && !!window.chrome?.webview;
const POLLING_INTERVAL_MS = 2000; // Poll every 2 seconds
const PREPARE_TIMEOUT_MS = 60000; // Timeout after 60 seconds

export interface PlayerState {
    isPaused: boolean;
    time: number;
    duration: number;
    volume: number;
    isMuted: boolean;
}

export function useMpvPlayer() {
    // --- RE-INTRODUCED "preparing" state for the new workflow ---
    const [status, setStatus] = useState<"idle" | "preparing" | "playing" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeStream, setActiveStream] = useState<{ infoHash: string | null; fileIndex: number | null; title: string } | null>(null);
    const [playerState, setPlayerState] = useState<PlayerState>({
        isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false,
    });

    // Refs to manage intervals and timeouts
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const lastVolumeRef = useRef(playerState.volume);
    const streamingApiUrl = `${APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('/graphql', '')}/api/v1/stream`;


    const sendCommand = useCallback((command: WebViewCommand) => {
        const message = JSON.stringify(command);
        if (isWebView()) window.chrome.webview!.postMessage(message);
        else console.log("WebView Outgoing:", message);
    }, []);

    const cleanupTimers = () => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        pollingIntervalRef.current = null;
        timeoutRef.current = null;
    };

    const stopAction = useCallback(() => {
        cleanupTimers(); // Ensure polling stops when the user closes the player
        const currentActiveStream = activeStream;
        if (status !== "idle" && currentActiveStream?.infoHash) {
            sendCommand({ command: "stop" });
            fetch(`${streamingApiUrl}/torrents/${currentActiveStream.infoHash}/cleanup`, { method: 'POST', keepalive: true })
                .catch(err => console.error("Failed to cleanup torrent on stop:", err));
        } else if (status !== "idle") {
            sendCommand({ command: "stop" });
        }
        setStatus("idle");
        setActiveStream(null);
        setPlayerState({ isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false });
    }, [sendCommand, status, activeStream, streamingApiUrl]);


    useEffect(() => {
        if (!isWebView()) return;
        const handleEvent = (e: MessageEvent<string>) => {
            try {
                const data: MpvEvent = JSON.parse(e.data) as MpvEvent;
                if (data.event === "property-change") {
                    const { property, value } = data.payload;
                    const keyMap: Record<string, keyof PlayerState> = { "time-pos": "time", "pause": "isPaused", "mute": "isMuted", "volume": "volume", "duration": "duration" };
                    const stateKey = keyMap[property as keyof typeof keyMap];
                    if (stateKey) {
                        setPlayerState((prev) => ({ ...prev, [stateKey]: value as never }));
                        if (stateKey === 'volume' && typeof value === 'number' && value > 0) lastVolumeRef.current = value;
                    }
                } else if (data.event === "playback-ended") {
                    stopAction();
                }
            } catch { /* Ignore */ }
        };
        window.chrome.webview!.addEventListener("message", handleEvent);
        return () => window.chrome.webview!.removeEventListener("message", handleEvent);
    }, [stopAction]);

    const actions = {
        playStream: useCallback((stream: Stream, title: string) => {
            if (!stream.infoHash || typeof stream.fileIdx !== 'number') {
                setStatus("error");
                setErrorMessage("This stream is not a valid torrent.");
                return;
            }

            // --- THE FIX: The logic is now incredibly simple ---
            // 1. Immediately show the player UI.
            setStatus("playing");
            setActiveStream({ infoHash: stream.infoHash, fileIndex: stream.fileIdx, title });

            // 2. Construct the direct streaming URL.
            const streamUrl = `${streamingApiUrl}/direct/${stream.infoHash}/${stream.fileIdx}`;

            // 3. Tell MPV to play it. The backend handles the rest.
            sendCommand({ command: "play", payload: { url: streamUrl } });
        }, [sendCommand, streamingApiUrl]),

        stop: stopAction,
        togglePause: useCallback(() => sendCommand({ command: "toggle-pause" }), [sendCommand]),
        toggleFullscreen: useCallback(() => sendCommand({ command: "toggle-fullscreen" }), [sendCommand]),
        seek: useCallback((time: number) => sendCommand({ command: "seek", payload: { time } }), [sendCommand]),
        setVolume: useCallback((volume: number) => {
            const newVolume = Math.max(0, Math.min(100, volume));
            sendCommand({ command: "set-volume", payload: { volume: newVolume } });
            if (playerState.isMuted) sendCommand({ command: "toggle-mute" });
        }, [sendCommand, playerState.isMuted]),
        toggleMute: useCallback(() => {
            if (playerState.isMuted && playerState.volume === 0) {
                const newVolume = lastVolumeRef.current > 0 ? lastVolumeRef.current : 70;
                sendCommand({ command: "set-volume", payload: { volume: newVolume } });
            }
            sendCommand({ command: "toggle-mute" });
        }, [sendCommand, playerState.isMuted, playerState.volume]),
    };

    return { status, errorMessage, activeStream, playerState, actions };
}