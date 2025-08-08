import type { PlayerState, MpvTrack } from "@/features/player/hooks/useMpvPlayer";

// This represents the generic shape for most properties
interface GenericPropertyChangeEvent {
    event: "property-change";
    payload: {
        property: Exclude<keyof PlayerState, 'trackList'> | "time-pos" | "paused-for-cache";
        value: unknown;
    };
}

// This represents the specific shape for the track-list property
interface TrackListChangeEvent {
    event: "property-change";
    payload: {
        property: "track-list";
        value: MpvTrack[]; // Use the specific, strong type
    };
}

interface PlaybackEndedEvent {
    event: "playback-ended";
}

interface PlaybackErrorEvent {
    event: "playback-error",
    payload: {
        message: string
    }
}

// MpvEvent is a union of all possible event shapes
export type MpvEvent = GenericPropertyChangeEvent | TrackListChangeEvent | PlaybackEndedEvent | PlaybackErrorEvent;