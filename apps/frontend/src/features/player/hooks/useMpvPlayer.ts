import { useEffect, useCallback, useReducer } from "react";
import { type WebViewCommand } from "@/types/webview/commands";
import { type MpvEvent } from "@/types/webview/events";
import type { Stream } from "@/lib/stream-parser";
import type { PlayerHook } from "../types";

const isWebView = () =>
    typeof window !== "undefined" && !!window.chrome?.webview;

export interface MpvTrack {
    id: number;
    "ff-index": number;
    type: "audio" | "sub" | "video";
    lang?: string;
    title?: string;
    selected?: boolean;
    codec?: string;
    "audio-channels"?: number;
    externalFilename?: string;
}

export interface PlayerState {
    isPaused: boolean;
    time: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    isBuffering: boolean;
    trackList: MpvTrack[];
}

interface State {
    status: "idle" | "playing" | "error";
    hasPlaybackStarted: boolean;
    errorMessage: string | null;
    activeStreamInfo: {
        infoHash: string | null | undefined;
        fileIndex: number | null | undefined;
    } | null;
    playerState: PlayerState;
}

const initialState: State = {
    status: "idle",
    hasPlaybackStarted: false,
    errorMessage: null,
    activeStreamInfo: null,
    playerState: {
        isPaused: true,
        time: 0,
        duration: 0,
        volume: 70,
        isMuted: false,
        isBuffering: false,
        trackList: [],
    },
};

type Action =
    | {
        type: "PLAY_COMMAND_ISSUED";
        payload: {
            url: string;
            startTime: number;
            infoHash?: string | null;
            fileIndex?: number | null;
        };
    }
    | { type: "PLAYBACK_FAILED"; payload: { message: string } }
    | { type: "PROPERTY_CHANGE"; payload: { property: string; value: unknown } }
    | { type: "STOP_PLAYBACK" };

function playerReducer(state: State, action: Action): State {
    switch (action.type) {
        case "PLAY_COMMAND_ISSUED":
            return {
                ...initialState,
                status: "playing",
                activeStreamInfo: {
                    infoHash: action.payload.infoHash,
                    fileIndex: action.payload.fileIndex,
                },
            };
        case "PLAYBACK_FAILED":
            return {
                ...state,
                status: "error",
                errorMessage: action.payload.message,
            };
        case "PROPERTY_CHANGE": {
            const { property, value } = action.payload;

            if (property === "track-list" && Array.isArray(value)) {
                return {
                    ...state,
                    playerState: { ...state.playerState, trackList: value as MpvTrack[] },
                };
            }

            if (
                property === "time-pos" &&
                typeof value === "number" &&
                value > 0 &&
                !state.hasPlaybackStarted
            ) {
                return {
                    ...state,
                    hasPlaybackStarted: true,
                    playerState: { ...state.playerState, time: value },
                };
            }

            const keyMap: Record<string, keyof PlayerState> = {
                "time-pos": "time",
                pause: "isPaused",
                mute: "isMuted",
                volume: "volume",
                duration: "duration",
                "paused-for-cache": "isBuffering",
                buffering: "isBuffering",
            }; // Add "buffering"
            const stateKey = keyMap[property];

            if (stateKey) {
                if (
                    (stateKey === "isPaused" ||
                        stateKey === "isMuted" ||
                        stateKey === "isBuffering") &&
                    typeof value === "boolean"
                ) {
                    return {
                        ...state,
                        playerState: { ...state.playerState, [stateKey]: value },
                    };
                }
                if (typeof value === "number") {
                    return {
                        ...state,
                        playerState: { ...state.playerState, [stateKey]: value },
                    };
                }
            }
            return state;
        }
        case "STOP_PLAYBACK":
            return initialState;
        default:
            return state;
    }
}

export function useMpvPlayer(): PlayerHook {
    const [state, dispatch] = useReducer(playerReducer, initialState);

    const sendCommand = useCallback((command: WebViewCommand) => {
        const message = JSON.stringify(command);
        if (isWebView() && window.chrome?.webview)
            window.chrome.webview.postMessage(message);
        else console.log("WebView Outgoing:", message);
    }, []);

    useEffect(() => {
        if (!isWebView()) return;
        const handleEvent = (e: MessageEvent<string>) => {
            try {
                const data:
                    | MpvEvent
                    | { event: "playback-error"; payload: { message: string } } =
                    JSON.parse(e.data);
                if (data.event === "property-change") {
                    dispatch({ type: "PROPERTY_CHANGE", payload: data.payload });
                } else if (data.event === "playback-ended") {
                    dispatch({ type: "STOP_PLAYBACK" });
                } else if (data.event === "playback-error") {
                    dispatch({ type: "PLAYBACK_FAILED", payload: { message: data.payload.message } });
                }
            } catch (error) {
                console.error("Failed to parse WebView message:", error);
            }
        };

        window.chrome.webview.addEventListener("message", handleEvent);
        return () => {
            if (window?.chrome?.webview)
                window.chrome.webview.removeEventListener("message", handleEvent);
        };
    }, []);

    const stopAction = useCallback(async () => {
        sendCommand({ command: "stop" });
        dispatch({ type: "STOP_PLAYBACK" });
    }, [sendCommand]);


    const actions = {
        play: useCallback(
            (url: string, startTime: number, stream?: Stream) => {
                dispatch({
                    type: "PLAY_COMMAND_ISSUED",
                    payload: {
                        url,
                        startTime,
                        infoHash: stream?.infoHash,
                        fileIndex: stream?.fileIdx,
                    },
                });
                sendCommand({ command: "play", payload: { url, startTime } });
            },
            [sendCommand],
        ),
        stop: stopAction,
        togglePause: useCallback(
            () => sendCommand({ command: "toggle-pause" }),
            [sendCommand],
        ),
        toggleFullscreen: useCallback(
            () => sendCommand({ command: "toggle-fullscreen" }),
            [sendCommand],
        ),
        seek: useCallback(
            (time: number) => sendCommand({ command: "seek", payload: { time } }),
            [sendCommand],
        ),
        setVolume: useCallback(
            (volume: number) => {
                const newVolume = Math.max(0, Math.min(100, volume));
                sendCommand({ command: "set-volume", payload: { volume: newVolume } });
                if (state.playerState.isMuted) sendCommand({ command: "toggle-mute" });
            },
            [sendCommand, state.playerState.isMuted],
        ),
        toggleMute: useCallback(() => {
            const currentVolume = state.playerState.volume;
            if (state.playerState.isMuted && currentVolume === 0) {
                const newVolume = 70;
                sendCommand({ command: "set-volume", payload: { volume: newVolume } });
            }
            sendCommand({ command: "toggle-mute" });
        }, [sendCommand, state.playerState.isMuted, state.playerState.volume]),
        setAudioId: useCallback(
            (id: number) => {
                sendCommand({
                    command: "set-property",
                    payload: { property: "aid", value: String(id) },
                });
            },
            [sendCommand],
        ),
        setSubtitleId: useCallback(
            (id: number) => {
                const value = id === -1 ? "no" : String(id);
                sendCommand({
                    command: "set-property",
                    payload: { property: "sid", value: value },
                });
            },
            [sendCommand],
        ),
        loadSubtitle: useCallback(
            (url: string) => {
                sendCommand({ command: "load-subtitle", payload: { url } });
            },
            [sendCommand],
        ),
    };

    return {
        status: state.status,
        errorMessage: state.errorMessage,
        playerState: state.playerState,
        actions,
        hasPlaybackStarted: state.hasPlaybackStarted,
    };
}