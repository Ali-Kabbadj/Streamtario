"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import {
  useMpvPlayer,
  type PlayerState,
} from "@/features/player/hooks/useMpvPlayer";
import { useProfileContext } from "./profile-provider";
import { graphqlClient } from "@/lib/graphql-client";
import {
  GetPlaybackHistoryDocument,
  UpdatePlaybackHistoryDocument,
} from "@/orchestrators/graphql-query-orchestrator/queries";
import { APP_CONFIG } from "@/config/env";
import { print } from "graphql";
import { useQueryClient } from "@tanstack/react-query";

type Stream = NonNullable<
  NonNullable<GetStreamsQuery["profile"]>["streams"]
>[0];

interface PlayerActions {
  playStream: (
    stream: Stream,
    title: string,
    logo: string | null,
    contentId: string,
    itemType: string,
  ) => void;
  resumeStream: (contentId: string) => void;
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
    stream: Stream;
    infoHash: string | null | undefined;
    fileIndex: number | null | undefined;
    title: string;
    logo?: string | null;
    contentId: string;
    itemType: string;
  } | null;
  playerState: PlayerState;
  actions: PlayerActions;
  hasPlaybackStarted: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useMpvPlayer();
  const { selectedProfile } = useProfileContext();
  const isSavingRef = useRef(false);
  const queryClient = useQueryClient();

  const saveProgress = useCallback(async () => {
    if (isSavingRef.current) return;

    const { activeStream, playerState } = player;
    const profileId = selectedProfile?.id;

    if (!profileId || !activeStream || playerState.duration <= 0) {
      return;
    }

    const progress = playerState.time / playerState.duration;
    if (playerState.time < 10) {
      return;
    }
    const isFinished = progress >= 0.95;

    isSavingRef.current = true;
    try {
      await graphqlClient.request(UpdatePlaybackHistoryDocument, {
        input: {
          profileId,
          contentId: activeStream.contentId,
          itemType: activeStream.itemType,
          positionSeconds: isFinished ? 0 : Math.round(playerState.time),
          durationSeconds: Math.round(playerState.duration),
          lastStreamDetails: isFinished ? null : activeStream.stream,
        },
      });
      const queryKey = ["playbackHistory", profileId, [activeStream.contentId]];
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: ["continueWatching", profileId],
      });
    } catch (error) {
      console.error("[PlayerProvider] Failed to save progress:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [player, selectedProfile, queryClient]);

  const playStream = async (
    stream: Stream,
    title: string,
    logo: string | null,
    contentId: string,
    itemType: string,
    startTime = 0,
  ) => {
    void player.actions.playStream(
      stream,
      title,
      logo,
      startTime,
      contentId,
      itemType,
    );
  };

  const resumeStream = async (contentId: string) => {
    if (!selectedProfile?.id) return;
    try {
      const historyData = await graphqlClient.request(
        GetPlaybackHistoryDocument,
        {
          profileId: selectedProfile.id,
          contentIds: [contentId],
        },
      );
      const historyItem = historyData.playbackHistory?.[0];
      const streamToPlay = historyItem?.lastStreamDetails as Stream | undefined;
      const itemType = historyItem?.itemType;
      const startTime = historyItem?.positionSeconds ?? 0;

      if (streamToPlay && itemType) {
        await playStream(
          streamToPlay,
          streamToPlay.title ?? "Untitled",
          null,
          contentId,
          itemType,
          startTime,
        );
      } else {
        console.warn("Resume failed: No last stream details found.");
      }
    } catch (error) {
      console.error("Failed to fetch history for resume:", error);
    }
  };

  const stop = useCallback(async () => {
    await saveProgress();
    player.actions.stop();
  }, [saveProgress, player.actions]);

  useEffect(() => {
    // This effect now correctly handles saving progress on window close
    const handleBeforeUnload = () => {
      const { activeStream, playerState } = player;
      const profileId = selectedProfile?.id;
      if (
        !profileId ||
        !activeStream ||
        playerState.duration <= 0 ||
        isSavingRef.current
      ) {
        return;
      }
      const progress = playerState.time / playerState.duration;
      const isFinished = progress >= 0.95;

      const payload = {
        query: print(UpdatePlaybackHistoryDocument),
        variables: {
          input: {
            profileId,
            contentId: activeStream.contentId,
            itemType: activeStream.itemType, // Use the correct itemType
            positionSeconds: isFinished ? 0 : Math.round(playerState.time),
            durationSeconds: Math.round(playerState.duration),
            lastStreamDetails: isFinished ? null : activeStream.stream,
          },
        },
      };
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      };
      navigator.sendBeacon(
        APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL,
        JSON.stringify(payload),
      );
    };

    if (player.status === "playing") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [player, selectedProfile?.id]);

  useEffect(() => {
    if (player.status === "playing" || player.status === "error") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [player.status]);

  const value = {
    ...player,
    actions: {
      ...player.actions,
      playStream: (
        stream: Stream,
        title: string,
        logo: string | null,
        contentId: string,
        itemType: string,
      ) => playStream(stream, title, logo, contentId, itemType, 0),
      resumeStream,
      stop,
    },
  };

  return (
    <PlayerContext.Provider value={value}>
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
