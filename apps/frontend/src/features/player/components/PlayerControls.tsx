"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import type { PlayerState } from "../hooks/useMpvPlayer";
import { StreamingStatusIndicator } from "./StreamingStatusIndicator";

interface PlayerControlsProps {
  playerState: PlayerState;
  actions: {
    togglePause: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
  };
}

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (num: number) => num.toString().padStart(2, "0");

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function PlayerControls({ playerState, actions }: PlayerControlsProps) {
  const { isPaused, time, duration, volume, isMuted } = playerState;

  const handleSeek = (values: number[]) => {
    actions.seek(values[0] ?? 0);
  };

  const handleVolumeChange = (values: number[]) => {
    actions.setVolume(values[0] ?? 0);
  };

  return (
    <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 to-transparent p-4">
      <div className="flex w-full items-center gap-4">
        <span className="w-14 text-center text-xs">{formatTime(time)}</span>
        <Slider
          value={[time]}
          max={duration}
          step={1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <span className="w-14 text-center text-xs">{formatTime(duration)}</span>
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
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StreamingStatusIndicator />
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
  );
}
