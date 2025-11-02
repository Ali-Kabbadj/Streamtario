// src/features/player/hooks/useBrowserPlayerAdapter.ts

import { useMemo, useRef, useState, useEffect } from "react";
import { useMediaStore, useMediaRemote, type MediaPlayerInstance } from "@vidstack/react";
import type { PlayerHook } from "../types";
import { initialPlayerState } from "./useBrowserPlayer";

export function useBrowserPlayerAdapter(): PlayerHook & { ref: React.RefObject<MediaPlayerInstance | null> } {
    const ref = useRef<MediaPlayerInstance | null>(null);
    const store = useMediaStore(ref);
    const remote = useMediaRemote(ref);

    const [seekOnPlay, setSeekOnPlay] = useState<number | null>(null);
    const [hasPlayIntent, setHasPlayIntent] = useState(false);

    useEffect(() => {
        if (ref.current && store.canPlay && seekOnPlay !== null) {
            remote.seek(seekOnPlay);
            setSeekOnPlay(null);
        }
    }, [ref, store.canPlay, seekOnPlay, remote]);

    const status = useMemo(() => {
        if (!hasPlayIntent) return "idle";
        if (store.error) return "error";
        if (store.ended) return "idle";
        if (store.canPlay || store.playing) return "playing";
        return "idle";
    }, [hasPlayIntent, store.error, store.ended, store.canPlay, store.playing]);

    const playerState = useMemo(() => {
        if (!hasPlayIntent || !ref.current) {
            return initialPlayerState;
        }
        return {
            isPaused: store.paused,
            time: store.currentTime,
            duration: store.duration,
            volume: store.volume * 100,
            isMuted: store.muted,
            isBuffering: store.waiting,
            trackList: [],
        };
    }, [hasPlayIntent, ref, store.paused, store.currentTime, store.duration, store.volume, store.muted, store.waiting]);

    const actions = useMemo(() => ({
        play: (_url: string, startTime: number) => {
            setHasPlayIntent(true);
            if (startTime > 0) {
                setSeekOnPlay(startTime);
            }
        },
        stop: async () => {
            remote.pause();
            setHasPlayIntent(false);
        },
        togglePause: () => remote.togglePaused(),
        toggleFullscreen: () => remote.toggleFullscreen(),
        seek: (time: number) => remote.seek(time),
        setVolume: (volume: number) => remote.changeVolume(volume / 100),
        toggleMute: () => remote.toggleMuted(),
        setAudioId: () => { },
        setSubtitleId: () => { },
        loadSubtitle: () => { },
    }), [remote]);

    return {
        status,
        errorMessage: store.error?.message ?? null,
        hasPlaybackStarted: store.started,
        playerState,
        actions,
        ref,
    };
}