import { useRef } from "react";
import type { MediaPlayerInstance } from "@vidstack/react";
import type { PlayerState } from "./useMpvPlayer";

export const initialPlayerState: PlayerState = {
    isPaused: true,
    time: 0,
    duration: 0,
    volume: 70,
    isMuted: false,
    isBuffering: false,
    trackList: [],
};

export function useBrowserPlayer() {
    const playerRef = useRef<MediaPlayerInstance | null>(null);
    return {
        ref: playerRef,
    };
}