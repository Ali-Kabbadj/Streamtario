import { useState, useEffect, useCallback, useRef } from "react";
import { type WebViewCommand } from "@/types/webview/commands";
import { type MpvEvent } from "@/types/webview/events";
import { APP_CONFIG } from "@/config/env";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = GetStreamsQuery["profile"]["streams"][0];

const isWebView = () => typeof window !== "undefined" && !!window.chrome?.webview;

export interface PlayerState {
    isPaused: boolean;
    time: number;
    duration: number;
    volume: number;
    isMuted: boolean;
}

export function useMpvPlayer() {
    const [status, setStatus] = useState<"idle" | "preparing" | "playing" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeStream, setActiveStream] = useState<{ infoHash: string | null; fileIndex: number | null; title: string } | null>(null);
    const [playerState, setPlayerState] = useState<PlayerState>({
        isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false,
    });
    const lastVolumeRef = useRef(playerState.volume);
    const streamingApiUrl = `${APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('/graphql', '')}/api/v1/stream`;

    const sendCommand = useCallback((command: WebViewCommand) => {
        const message = JSON.stringify(command);
        if (isWebView()) {
            window.chrome.webview!.postMessage(message);
        } else {
            console.log("WebView Outgoing:", message);
        }
    }, []);

    const stopAction = useCallback(() => {
        const currentActiveStream = activeStream;
        if (status !== "idle" && currentActiveStream?.infoHash) {
            sendCommand({ command: "stop" });
            fetch(`${streamingApiUrl}/torrents/${currentActiveStream.infoHash}/pause`, { method: 'POST' })
                .catch(err => console.error("Failed to pause torrent on stop:", err));
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
                switch (data.event) {
                    case "property-change": {
                        const { property, value } = data.payload;
                        const keyMap: Record<string, keyof PlayerState> = {
                            "time-pos": "time", "pause": "isPaused", "mute": "isMuted",
                            "volume": "volume", "duration": "duration",
                        };
                        const stateKey = keyMap[property as keyof typeof keyMap];
                        if (stateKey) {
                            setPlayerState((prev) => ({ ...prev, [stateKey]: value as never }));
                            if (stateKey === 'volume' && typeof value === 'number' && value > 0) {
                                lastVolumeRef.current = value;
                            }
                        }
                        break;
                    }
                    case "playback-ended": {
                        stopAction();
                        break;
                    }
                }
            } catch { /* Ignore */ }
        };
        window.chrome.webview!.addEventListener("message", handleEvent);
        return () => window.chrome.webview!.removeEventListener("message", handleEvent);
    }, [stopAction]);

    const actions = {
        playStream: useCallback(async (stream: Stream, title: string) => {
            setStatus("preparing");
            setActiveStream({ infoHash: stream.infoHash ?? null, fileIndex: stream.fileIdx ?? null, title });

            if (stream.infoHash && typeof stream.fileIdx === 'number') {
                try {
                    const torrentsUrl = `${streamingApiUrl}/torrents`;

                    const body = {
                        infoHash: stream.infoHash,
                        torrentURL: stream.url
                    };

                    // =================================================================
                    // THE CRITICAL FIX: RESTORED THE FETCH OPTIONS
                    // =================================================================
                    const addTorrentResponse = await fetch(torrentsUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });

                    if (!addTorrentResponse.ok) {
                        const errorText = await addTorrentResponse.text();
                        throw new Error(errorText || `Server failed to add torrent [${addTorrentResponse.status}]`);
                    }

                    const selectFileResponse = await fetch(`${torrentsUrl}/${stream.infoHash}/select/${stream.fileIdx}`, {
                        method: 'POST',
                    });

                    if (!selectFileResponse.ok) {
                        const errorText = await selectFileResponse.text();
                        throw new Error(errorText || `Server failed to select file [${selectFileResponse.status}]`);
                    }
                    // =================================================================

                    const streamUrl = `${streamingApiUrl}/direct/${stream.infoHash}/${stream.fileIdx}`;
                    sendCommand({ command: "play", payload: { url: streamUrl } });
                    setStatus("playing");
                    return;

                } catch (error) {
                    console.error("Failed to prepare torrent stream:", error);
                    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                    setStatus("error");
                    setErrorMessage(errorMessage);
                    return;
                }
            }

            if (stream.url && (stream.url.startsWith('http://') || stream.url.startsWith('https://'))) {
                sendCommand({ command: "play", payload: { url: stream.url } });
                setStatus("playing");
                return;
            }

            setStatus("error");
            setErrorMessage("This stream format is not supported.");

        }, [sendCommand, streamingApiUrl]),

        stop: stopAction,

        togglePause: useCallback(() => sendCommand({ command: "toggle-pause" }), [sendCommand]),
        toggleFullscreen: useCallback(() => sendCommand({ command: "toggle-fullscreen" }), [sendCommand]),
        seek: useCallback((time: number) => sendCommand({ command: "seek", payload: { time } }), [sendCommand]),
        setVolume: useCallback((volume: number) => {
            sendCommand({ command: "set-volume", payload: { volume } });
        }, [sendCommand]),
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