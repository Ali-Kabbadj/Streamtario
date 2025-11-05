import type { PlayerState, MpvTrack } from "@/features/player/hooks/useMpvPlayer";

interface GenericPropertyChangeEvent {
    event: "property-change";
    payload: {
        property: Exclude<keyof PlayerState, 'trackList'> | "time-pos" | "paused-for-cache";
        value: unknown;
    };
}

interface TrackListChangeEvent {
    event: "property-change";
    payload: {
        property: "track-list";
        value: MpvTrack[];
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

export type MpvEvent = GenericPropertyChangeEvent | TrackListChangeEvent | PlaybackEndedEvent | PlaybackErrorEvent;