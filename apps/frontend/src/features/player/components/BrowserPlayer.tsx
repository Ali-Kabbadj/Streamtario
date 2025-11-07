"use client";

import { forwardRef } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import type { MediaPlayerInstance } from "@vidstack/react";

import "@vidstack/react/player/styles/default/theme.css";

interface BrowserPlayerProps {
  src: string | null;
}

export const BrowserPlayer = forwardRef<
  MediaPlayerInstance,
  BrowserPlayerProps
>(({ src }, ref) => {
  if (!src) return null;

  return (
    <MediaPlayer
      className="h-full max-h-full w-full max-w-full"
      ref={ref}
      src={src}
      autoPlay
      playsInline
    >
      <MediaProvider itemType="mp4" />
    </MediaPlayer>
  );
});

BrowserPlayer.displayName = "BrowserPlayer";
