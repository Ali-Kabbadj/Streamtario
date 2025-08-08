"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "./Slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
} from "lucide-react";
import type { MpvTrack } from "../hooks/useMpvPlayer";
import { StreamingStatusIndicator } from "./StreamingStatusIndicator";
import { useMemo, useState } from "react";
import { usePlayer } from "@/providers/PlayerProvider";
import { SettingsSheet, type TrackItem } from "./SettingsSheet";
import type { SubtitleType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { getLanguageName } from "@/lib/language-utils";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function PlayerControls() {
  const { playerState, actions, externalSubtitles } = usePlayer();
  const { isPaused, time, duration, volume, isMuted, trackList } = playerState;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { audioTracks, selectedAudioId } = useMemo(() => {
    const tracks: MpvTrack[] =
      trackList?.filter((track) => track.type === "audio") ?? [];
    const selectedTrack = tracks.find((track) => track.selected);
    return {
      audioTracks: tracks.map(
        (track): TrackItem => ({
          id: track.id,
          label: track.title ?? getLanguageName(track.lang ?? "unknown"),
          description: `${track.codec ?? "N/A"}, ${
            track["audio-channels"] ?? "N/A"
          } channels`,
          lang: track.lang ?? "unknown",
          source: "Embedded",
        }),
      ),
      selectedAudioId: selectedTrack?.id,
    };
  }, [trackList]);

  const { subtitleTracks, selectedSubtitleId } = useMemo(() => {
    const embeddedSubs: TrackItem[] =
      trackList
        ?.filter((track) => track.type === "sub")
        .map((track) => ({
          id: track.id,
          label: track.title ?? getLanguageName(track.lang ?? "unknown"),
          lang: track.lang ?? "unknown",
          source: "Embedded",
        })) ?? [];

    const externalSubs: TrackItem[] = (externalSubtitles ?? []).map(
      (sub: SubtitleType): TrackItem => ({
        id: sub.url,

        label: getLanguageName(sub.lang),

        lang: sub.lang,
        source: sub.type ?? "Addon",
      }),
    );

    const allSubs = [...embeddedSubs, ...externalSubs];

    const selectedTrack = trackList?.find(
      (track) => track.type === "sub" && track.selected,
    );
    let finalSelectedId: string | number | undefined;

    if (selectedTrack) {
      const matchingExternal = externalSubtitles?.find(
        (sub) => sub.url === selectedTrack.title,
      );
      if (matchingExternal) {
        finalSelectedId = matchingExternal.url;
      } else {
        finalSelectedId = selectedTrack.id;
      }
    }

    return {
      subtitleTracks: allSubs,
      selectedSubtitleId: finalSelectedId,
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
                {isMuted || volume === 0 ? (
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
        selectedAudioId={selectedAudioId}
        selectedSubtitleId={selectedSubtitleId}
        onSelectAudio={actions.setAudioId}
        onSelectSubtitle={handleSelectSubtitle}
      />
    </>
  );
}
