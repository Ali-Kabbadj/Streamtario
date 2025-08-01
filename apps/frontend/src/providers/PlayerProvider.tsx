"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import {
  useMpvPlayer,
  type PlayerState,
} from "@/features/player/hooks/useMpvPlayer";

type Stream = NonNullable<NonNullable<GetStreamsQuery["profile"]>["streams"]>[0];

interface PlayerActions {
  playStream: (stream: Stream, title: string) => void;
  stop: () => void;
  togglePause: () => void;
  toggleFullscreen: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

interface PlayerContextType {
  status: "idle" | "preparing" | "playing" | "error";
  errorMessage: string | null;
  activeStream: {
    infoHash: string | null;
    fileIndex: number | null;
    title: string;
  } | null;
  playerState: PlayerState;
  actions: PlayerActions;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useMpvPlayer();

  return (
    <PlayerContext.Provider value={player}>
      {children}
      <PlayerOverlay />
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
