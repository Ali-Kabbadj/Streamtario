"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
} from "lucide-react";
import type { MpvTrack, PlayerState } from "../hooks/useMpvPlayer";
import { StreamingStatusIndicator } from "./StreamingStatusIndicator";
import { useMemo, useState, useEffect, useRef } from "react"; // Added useEffect and useRef
import { useSubtitles } from "../hooks/useSubtitles";
import { usePlayer } from "@/providers/PlayerProvider";
import { SettingsSheet, type TrackItem } from "./SettingsSheet";
import type { SubtitleType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { useStreamingServerStats } from "../hooks/useStreamingServerStats";

interface PlayerControlsProps {
  playerState: PlayerState;
  actions: {
    togglePause: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    setAudioId: (id: number) => void;
    setSubtitleId: (id: number) => void;
    loadSubtitle: (url: string) => void;
  };
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function PlayerControls({ playerState, actions }: PlayerControlsProps) {
  const { isPaused, time, duration, volume, isMuted, trackList } = playerState;
  const { activeStream } = usePlayer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { stats: torrentStats } = useStreamingServerStats();
  const subtitleQueryAttempted = useRef(false);

  // 1. Prepare the variables from all sources. They will be undefined until ready.
  const subtitleQueryVars = useMemo(() => {
    const contentId = activeStream?.contentId;
    const itemType = activeStream?.itemType;
    const videoHash = activeStream?.stream.behaviorHints?.videoHash as
      | string
      | undefined;
    const currentTorrent = torrentStats.find(
      (t) => t.hash === activeStream?.infoHash,
    );
    const currentFile = currentTorrent?.file_stats?.find(
      (f) => f.index === activeStream?.fileIndex,
    );
    const filename = currentFile?.path;
    const videoSize = currentFile?.length;

    return { contentId, itemType, videoHash, filename, videoSize };
  }, [activeStream, torrentStats]);

  // 2. Setup the disabled query and get the refetch function.
  const {
    data: externalSubtitles,
    isLoading: isLoadingSubtitles,
    refetch: fetchSubtitles,
  } = useSubtitles(subtitleQueryVars);

  // 3. This effect is the TRIGGER.
  useEffect(() => {
    // When a new stream starts playing, reset our attempt flag.
    if (activeStream) {
      subtitleQueryAttempted.current = false;
    }
  }, [activeStream?.contentId]); // Dependency on contentId ensures it resets for new episodes.

  useEffect(() => {
    // Check if ALL variables are now defined.
    const allVarsReady = Object.values(subtitleQueryVars).every(Boolean);

    // If all variables are ready AND we have not yet attempted to fetch...
    if (allVarsReady && !subtitleQueryAttempted.current) {
      // ...then we fire the query manually.
      console.log(
        "All subtitle variables are ready. Fetching subtitles.",
        subtitleQueryVars,
      );
      void fetchSubtitles();
      // And we set the flag to prevent this from firing on every single stat update.
      subtitleQueryAttempted.current = true;
    }
  }, [subtitleQueryVars, fetchSubtitles]); // This effect runs whenever the variables change.

  // The rest of the component's logic is now correct because it waits for the data.
  const { audioTracks, selectedAudioTrackId } = useMemo(() => {
    const tracks: MpvTrack[] = trackList.filter(
      (track) => track.type === "audio",
    );
    const selectedTrack = tracks.find((track) => track.selected);
    return {
      audioTracks: tracks.map(
        (track): TrackItem => ({
          id: track.id,
          label:
            track.title ?? track.lang ?? track.codec ?? `Track ${track.id}`,
          description: `${track.codec ?? "N/A"}, ${track["audio-channels"] ?? "N/A"} channels`,
          lang: track.lang ?? "unknown",
          source: "Embedded",
        }),
      ),
      selectedAudioTrackId: selectedTrack?.id,
    };
  }, [trackList]);

  const { subtitleTracks, selectedSubtitleTrackId } = useMemo(() => {
    const embeddedSubs: TrackItem[] = trackList
      .filter((track) => track.type === "sub")
      .map((track) => ({
        id: track.id,
        label: track.title ?? track.lang ?? `Track ${track.id}`,
        lang: track.lang ?? "unknown",
        source: "Embedded",
      }));

    const externalSubs: TrackItem[] = (externalSubtitles ?? []).map(
      (sub: SubtitleType) => ({
        id: sub.url,
        label: `${sub.type ?? "Addon"} - ${sub.lang}`,
        lang: sub.lang,
        source: sub.type ?? "Addon",
      }),
    );

    const allSubs = [...embeddedSubs, ...externalSubs];
    const selectedTrack = trackList.find(
      (track) => track.type === "sub" && track.selected,
    );
    return {
      subtitleTracks: allSubs,
      selectedSubtitleTrackId: selectedTrack?.id,
    };
  }, [trackList, externalSubtitles]);

  const handleSelectSubtitle = (track: TrackItem) => {
    if (track.id === -1) {
      actions.setSubtitleId(-1);
      return;
    }
    if (track.source === "Embedded") {
      actions.setSubtitleId(track.id as number);
    } else {
      actions.loadSubtitle(track.id as string);
    }
  };

  return (
    <>
      <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="flex w-full items-center gap-4">
          <span className="w-14 text-center text-xs">{formatTime(time)}</span>
          <Slider
            value={[time]}
            max={duration}
            step={1}
            onValueChange={(v) => actions.seek(v[0] ?? 0)}
          />
          <span className="w-14 text-center text-xs">
            {formatTime(duration)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={actions.togglePause}>
              {isPaused ? (
                <Play className="h-6 w-6" />
              ) : (
                <Pause className="h-6 w-6" />
              )}
            </Button>
            <div className="flex w-32 items-center gap-2">
              <Button variant="ghost" size="icon" onClick={actions.toggleMute}>
                {(isMuted ?? volume === 0) ? (
                  <VolumeX className="h-6 w-6" />
                ) : (
                  <Volume2 className="h-6 w-6" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(v) => actions.setVolume(v[0] ?? 0)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreamingStatusIndicator />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={actions.toggleFullscreen}
            >
              <Maximize className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
      <SettingsSheet
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        selectedAudioId={selectedAudioTrackId}
        selectedSubtitleId={selectedSubtitleTrackId}
        onSelectAudio={actions.setAudioId}
        onSelectSubtitle={handleSelectSubtitle}
      />
    </>
  );
}
