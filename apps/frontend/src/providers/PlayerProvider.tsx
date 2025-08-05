"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import {
  useMpvPlayer,
  type PlayerState,
} from "@/features/player/hooks/useMpvPlayer";

type Stream = NonNullable<
  NonNullable<GetStreamsQuery["profile"]>["streams"]
>[0];

interface PlayerActions {
  playStream: (stream: Stream, title: string, logo: string | null) => void;
  stop: () => void;
  togglePause: () => void;
  toggleFullscreen: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

interface PlayerContextType {
  status: "idle" | "playing" | "error";
  errorMessage: string | null;
  activeStream: {
    infoHash: string | null | undefined;
    fileIndex: number | null | undefined;
    title: string;
    logo?: string | null;
  } | null;
  playerState: PlayerState;
  actions: PlayerActions;
  hasPlaybackStarted: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useMpvPlayer();

  useEffect(() => {
    if (player.status === "playing" || player.status === "error") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [player.status]);

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
