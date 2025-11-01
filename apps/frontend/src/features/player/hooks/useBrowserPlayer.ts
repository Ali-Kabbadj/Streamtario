import { useCallback, useState } from "react";
import type { PlayerState } from "./useMpvPlayer";
import type { PlayerActions, PlayerHook } from "../types";

const initialPlayerState: PlayerState = {
    isPaused: true,
    time: 0,
    duration: 0,
    volume: 70,
    isMuted: false,
    isBuffering: false,
    trackList: [],
};

/**
 * Placeholder hook for a browser-native player (e.g., React Player).
 * Implements the PlayerHook interface but its actions are not yet functional.
 */
export function useBrowserPlayer(): PlayerHook {
    const [status, setStatus] = useState<"idle" | "playing" | "error">("idle");

    const notImplemented = useCallback((name: keyof PlayerActions) => {
        console.warn(`BrowserPlayer action "${name}" is not implemented yet.`);
        setStatus("error");
    }, []);

    const actions: PlayerActions = {
        play: useCallback(() => notImplemented("play"), [notImplemented]),
        stop: useCallback(async () => {
            setStatus("idle");
        }, []),
        togglePause: useCallback(() => notImplemented("togglePause"), [notImplemented]),
        toggleFullscreen: useCallback(() => notImplemented("toggleFullscreen"), [notImplemented]),
        seek: useCallback(() => notImplemented("seek"), [notImplemented]),
        setVolume: useCallback(() => notImplemented("setVolume"), [notImplemented]),
        toggleMute: useCallback(() => notImplemented("toggleMute"), [notImplemented]),
        setAudioId: useCallback(() => notImplemented("setAudioId"), [notImplemented]),
        setSubtitleId: useCallback(() => notImplemented("setSubtitleId"), [notImplemented]),
        loadSubtitle: useCallback(() => notImplemented("loadSubtitle"), [notImplemented]),
    };

    return {
        status,
        errorMessage: status === 'error' ? "This player is not yet implemented." : null,
        hasPlaybackStarted: false,
        playerState: initialPlayerState,
        actions,
    };
}