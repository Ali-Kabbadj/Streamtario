import { useEffect, useCallback, useReducer } from "react";
import { type WebViewCommand } from "@/types/webview/commands";
import { type MpvEvent } from "@/types/webview/events";
import { APP_CONFIG } from "@/config/env";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = NonNullable<GetStreamsQuery["profile"]>["streams"][number];

const isWebView = () => typeof window !== "undefined" && !!window.chrome?.webview;

// --- STATE ---
export interface PlayerState {
    isPaused: boolean;
    time: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isBuffering: boolean;
}

interface State {
    status: "idle" | "playing" | "error";
    hasPlaybackStarted: boolean;
    errorMessage: string | null;
    activeStream: { infoHash: string | null | undefined; fileIndex: number | null | undefined; title: string; logo?: string | null; } | null;
    playerState: PlayerState;
}

const initialState: State = {
    status: "idle",
    hasPlaybackStarted: false,
    errorMessage: null,
    activeStream: null,
    playerState: {
        isPaused: true, time: 0, duration: 0, volume: 70, isMuted: false, isBuffering: false,
    },
};

// --- ACTIONS ---
type Action =
    | { type: 'PLAY_STREAM_START'; payload: { stream: Stream; title: string; logo?: string | null; } }
    | { type: 'PLAY_STREAM_FAILED'; payload: { message: string } }
    | { type: 'PROPERTY_CHANGE'; payload: { property: string; value: unknown } }
    | { type: 'STOP_PLAYBACK' };

// --- REDUCER ---
function playerReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'PLAY_STREAM_START':
            return {
                ...initialState,
                status: 'playing',
                activeStream: {
                    infoHash: action.payload.stream.infoHash,
                    fileIndex: action.payload.stream.fileIdx,
                    title: action.payload.title,
                    logo: action.payload.logo,
                },
            };
        case 'PLAY_STREAM_FAILED':
            return {
                ...state,
                status: 'error',
                errorMessage: action.payload.message,
            };
        case 'PROPERTY_CHANGE': {
            const { property, value } = action.payload;

            if (property === 'time-pos' && typeof value === 'number' && value > 0 && !state.hasPlaybackStarted) {
                return { ...state, hasPlaybackStarted: true, playerState: { ...state.playerState, time: value } };
            }

            const keyMap: Record<string, keyof PlayerState> = { "time-pos": "time", "pause": "isPaused", "mute": "isMuted", "volume": "volume", "duration": "duration", "paused-for-cache": "isBuffering" };
            const stateKey = keyMap[property];

            if (stateKey) {
                if ((stateKey === "isPaused" || stateKey === "isMuted" || stateKey === "isBuffering") && typeof value === "boolean") {
                    return { ...state, playerState: { ...state.playerState, [stateKey]: value } };
                }
                if (typeof value === "number") {
                    return { ...state, playerState: { ...state.playerState, [stateKey]: value } };
                }
            }
            return state;
        }
        case 'STOP_PLAYBACK':
            return initialState;
        default:
            return state;
    }
}

export function useMpvPlayer() {
    const [state, dispatch] = useReducer(playerReducer, initialState);
    const streamingApiUrl = `${APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('/graphql', '')}/api/v1/stream`;

    const sendCommand = useCallback((command: WebViewCommand) => {
        const message = JSON.stringify(command);
        if (isWebView() && window.chrome?.webview) window.chrome.webview.postMessage(message);
        else console.log("WebView Outgoing:", message);
    }, []);

    useEffect(() => {
        if (!isWebView()) return;
        const handleEvent = (e: MessageEvent<string>) => {
            try {
                const data: MpvEvent | { event: "playback-error", payload: { message: string } } = JSON.parse(e.data);
                if (data.event === "property-change") {
                    dispatch({ type: 'PROPERTY_CHANGE', payload: data.payload });
                } else if (data.event === "playback-ended") {
                    dispatch({ type: 'STOP_PLAYBACK' });
                } else if (data.event === "playback-error") {
                    dispatch({ type: 'PLAY_STREAM_FAILED', payload: { message: data.payload.message } });
                }
            } catch (error) {
                console.error("Failed to parse WebView message:", error);
            }
        };

        window.chrome.webview.addEventListener("message", handleEvent);
        return () => { if (window?.chrome?.webview) window.chrome.webview.removeEventListener("message", handleEvent); };
    }, []);

    const stopAction = useCallback(() => {
        if (state.activeStream?.infoHash) {
            const cleanupUrl = `${streamingApiUrl}/cleanup/${state.activeStream.infoHash}`;
            navigator.sendBeacon(cleanupUrl);
        }
        sendCommand({ command: "stop" });
        dispatch({ type: 'STOP_PLAYBACK' });
    }, [sendCommand, streamingApiUrl, state.activeStream]);

    const actions = {
        prepareStream: useCallback((stream: Stream) => {
            if (!stream.infoHash) return;
            fetch(`${streamingApiUrl}/prepare-streams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ infoHashes: [stream.infoHash] }),
            }).catch(err => {
                console.warn("Stream pre-fetch failed:", err);
            });
        }, [streamingApiUrl]),

        playStream: useCallback((stream: Stream, title: string, logo?: string | null) => {
            if (!stream.infoHash || stream.fileIdx === null) {
                dispatch({ type: 'PLAY_STREAM_FAILED', payload: { message: 'This stream is not a valid torrent.' } });
                return;
            }

            dispatch({ type: 'PLAY_STREAM_START', payload: { stream, title, logo } });

            fetch(`${streamingApiUrl}/setup-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ infoHash: stream.infoHash, announce: stream.announce }),
            })
                .then(response => {
                    if (!response.ok) return response.text().then(text => { throw new Error(text || 'Setup failed') });
                    const streamUrl = `${streamingApiUrl}/direct/${stream.infoHash}/${stream.fileIdx}`;
                    sendCommand({ command: "play", payload: { url: streamUrl } });
                })
                .catch(err => {
                    console.error("Stream setup error:", err);
                    dispatch({ type: 'PLAY_STREAM_FAILED', payload: { message: err.message } });
                });
        }, [sendCommand, streamingApiUrl]),

        stop: stopAction,
        togglePause: useCallback(() => sendCommand({ command: "toggle-pause" }), [sendCommand]),
        toggleFullscreen: useCallback(() => sendCommand({ command: "toggle-fullscreen" }), [sendCommand]),
        seek: useCallback((time: number) => sendCommand({ command: "seek", payload: { time } }), [sendCommand]),
        setVolume: useCallback((volume: number) => {
            const newVolume = Math.max(0, Math.min(100, volume));
            sendCommand({ command: "set-volume", payload: { volume: newVolume } });
            if (state.playerState.isMuted) sendCommand({ command: "toggle-mute" });
        }, [sendCommand, state.playerState.isMuted]),
        toggleMute: useCallback(() => {
            const currentVolume = state.playerState.volume;
            if (state.playerState.isMuted && currentVolume === 0) {
                const newVolume = 70;
                sendCommand({ command: "set-volume", payload: { volume: newVolume } });
            }
            sendCommand({ command: "toggle-mute" });
        }, [sendCommand, state.playerState.isMuted, state.playerState.volume]),
    };

    return {
        status: state.status,
        errorMessage: state.errorMessage,
        activeStream: state.activeStream,
        playerState: state.playerState,
        actions,
        hasPlaybackStarted: state.hasPlaybackStarted,
    };
}