import type { PlayerState } from "@/features/player/hooks/useMpvPlayer";

// This defines the payload for property change events from MPV
interface PropertyChangeEvent {
    event: "property-change";
    payload: {
        property: keyof PlayerState | "time-pos" | "paused-for-cache";
        value: unknown;
    };
}

// This defines the event for when the video file has finished
interface PlaybackEndedEvent {
    event: "playback-ended";
}

// This is the union of all possible MPV-related events
export type MpvEvent = PropertyChangeEvent | PlaybackEndedEvent;