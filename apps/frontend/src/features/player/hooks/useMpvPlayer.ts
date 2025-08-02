import { useState, useEffect, useCallback, useRef } from "react";
import { type WebViewCommand } from "@/types/webview/commands";
import { type MpvEvent } from "@/types/webview/events";
import { APP_CONFIG } from "@/config/env";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = NonNullable<GetStreamsQuery["profile"]>["streams"][number];

const isWebView = () => typeof window !== "undefined" && !!window.chrome?.webview;

export interface PlayerState {
    isPaused: boolean;
    time: number;
    duration: number;
    volume: number;
    isMuted: boolean;
}

// Add the new event to our type definition
interface PlaybackStartedEvent {
    event: "playback-started";
}

type WebViewEvent = MpvEvent | PlaybackStartedEvent;

export function useMpvPlayer() {
    const [status, setStatus] = useState<"idle" | "preparing" | "playing" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeStream, setActiveStream] = useState<{ infoHash: string | null; fileIndex: number | null; title: string; logo?: string | null; } | null>(null);
    const [playerState, setPlayerState] = useState<PlayerState>({
        isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false,
    });
    const lastVolumeRef = useRef(playerState.volume);
    const streamingApiUrl = `${APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('/graphql', '')}/api/v1/stream`;

    const sendCommand = useCallback((command: WebViewCommand) => {
        const message = JSON.stringify(command);
        if (isWebView() && window.chrome?.webview) window.chrome.webview.postMessage(message);
        else console.log("WebView Outgoing:", message);
    }, []);

    const stopAction = useCallback(() => {
        sendCommand({ command: "set-webview-visibility", payload: { visible: false } });

        const currentActiveStream = activeStream;
        if (currentActiveStream?.infoHash) {
            const cleanupUrl = `${streamingApiUrl}/cleanup/${currentActiveStream.infoHash}`;
            navigator.sendBeacon(cleanupUrl);
            console.log(`[Player] Sent cleanup beacon for ${currentActiveStream.infoHash}`);
        }

        sendCommand({ command: "stop" });
        setStatus("idle");
        setActiveStream(null);
        setPlayerState({ isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false });
    }, [sendCommand, activeStream, streamingApiUrl]);


    useEffect(() => {
        if (!isWebView()) return;
        const handleEvent = (e: MessageEvent<string>) => {
            try {
                const data: WebViewEvent = JSON.parse(e.data) as WebViewEvent;

                // THE NEW LOGIC: We only switch to "playing" on our new, reliable event.
                if (data.event === "playback-started") {
                    if (status === 'preparing') {
                        setStatus('playing');
                    }
                } else if (data.event === "property-change") {
                    const { property, value } = data.payload;
                    const keyMap: Record<string, keyof PlayerState> = { "time-pos": "time", "pause": "isPaused", "mute": "isMuted", "volume": "volume", "duration": "duration" };
                    const stateKey = keyMap[property as keyof typeof keyMap];
                    if (stateKey) {
                        if ((stateKey === "isPaused" || stateKey === "isMuted") && typeof value === "boolean") {
                            setPlayerState((prev) => ({ ...prev, [stateKey]: value }));
                        } else if ((stateKey === "time" || stateKey === "duration" || stateKey === "volume") && typeof value === "number") {
                            setPlayerState((prev) => ({ ...prev, [stateKey]: value }));
                            if (stateKey === "volume" && value > 0) {
                                lastVolumeRef.current = value;
                            }
                        }
                    }
                } else if (data.event === "playback-ended") {
                    stopAction();
                }
            } catch (error) {
                console.error("Failed to parse WebView message:", error);
            }
        };
        if (!window?.chrome?.webview) {
            console.warn("WebView API not available.");
            return;
        }
        window.chrome.webview.addEventListener("message", handleEvent);
        return () => {
            if (window.chrome?.webview) {
                window.chrome.webview.removeEventListener("message", handleEvent);
            }
        };
    }, [stopAction, status]); // status is a dependency now

    const actions = {
        playStream: useCallback((stream: Stream, title: string, logo?: string | null) => {
            if (stream.infoHash == null || stream.fileIdx == null) {
                setStatus("error");
                setErrorMessage("This stream is not a valid torrent.");
                return;
            }

            setStatus("preparing");
            setActiveStream({ infoHash: stream.infoHash, fileIndex: stream.fileIdx, title, logo });
            sendCommand({ command: "set-webview-visibility", payload: { visible: true } });

            const streamUrl = `${streamingApiUrl}/direct/${stream.infoHash}/${stream.fileIdx}`;
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