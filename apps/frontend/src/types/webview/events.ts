import type { PlayerState } from "@/features/player/hooks/useMpvPlayer";

interface PropertyChangeEvent {
    event: "property-change";
    payload: {
        property: keyof PlayerState | "time-pos" | "paused-for-cache";
        value: unknown;
    };
}

interface PlaybackEndedEvent {
    event: "playback-ended";
}

export type MpvEvent = PropertyChangeEvent | PlaybackEndedEvent;