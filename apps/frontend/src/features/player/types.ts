import type { PlayerState } from "./hooks/useMpvPlayer";
import type { Stream } from "@/lib/stream-parser";

export interface PlayerActions {
    play: (url: string, startTime: number, stream?: Stream) => void;
    stop: () => Promise<void>;
    togglePause: () => void;
    toggleFullscreen: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setAudioId: (id: number) => void;
    setSubtitleId: (id: number) => void;
    loadSubtitle: (url: string) => void;
}

export interface PlayerHook {
    status: "idle" | "playing" | "error";
    errorMessage: string | null;
    hasPlaybackStarted: boolean;
    playerState: PlayerState;
    actions: PlayerActions;
}