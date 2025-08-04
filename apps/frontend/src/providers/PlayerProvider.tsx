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

// The context now provides the full return value of the hook
interface PlayerContextType {
  status: "idle" | "playing" | "error";
  errorMessage: string | null;
  activeStream: {
    infoHash: string | null;
    fileIndex: number | null;
    title: string;
    logo: string | null;
  } | null;
  playerState: PlayerState;
  actions: PlayerActions;
  hasPlaybackStarted: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  // The provider is now the single source of truth. It calls the hook.
  const player = useMpvPlayer();

  // The side effect for managing the body class now lives here, where it belongs.
  useEffect(() => {
    if (player.status === "playing" || player.status === "error") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [player.status]);

  return (
    // The entire player object is provided to the context.
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
