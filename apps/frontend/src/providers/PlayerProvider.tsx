"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import type {
  GetContinueWatchingQuery,
  GetPlaybackHistoryByImdbIdQuery,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import {
  useMpvPlayer,
  type PlayerState,
} from "@/features/player/hooks/useMpvPlayer";
import { useProfileContext } from "./profile-provider";
import { graphqlClient } from "@/lib/graphql-client";
import { UpdatePlaybackHistoryDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import { APP_CONFIG } from "@/config/env";
import { print } from "graphql";
import { useQueryClient } from "@tanstack/react-query";
import type { Stream } from "@/features/meta/types";
import { useStreamingServerStats } from "@/features/player/hooks/useStreamingServerStats";

type PlaybackHistoryItem =
  | NonNullable<
      NonNullable<GetContinueWatchingQuery["profile"]>["continueWatching"]
    >[0]
  | NonNullable<GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"]>[0];

interface PlayerActions {
  playStream: (
    stream: Stream,
    title: string,
    logo: string | null,
    contentId: string,
    itemType: string,
  ) => void;
  resumeStream: (historyItem: PlaybackHistoryItem) => void;
  stop: () => void;
  togglePause: () => void;
  toggleFullscreen: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setAudioId: (id: number) => void;
  setSubtitleId: (id: number) => void;
  loadSubtitle: (url: string) => void;
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
  const { stats: torrentStats } = useStreamingServerStats(); // Get real-time stats
  const isSavingRef = useRef(false);

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

    // THIS IS THE KEY CHANGE: Enrich the stream details with real-time stats
    const activeTorrentStat = torrentStats.find(
      (t) => t.hash === activeStream.infoHash,
    );
    const activeFileStat = activeTorrentStat?.file_stats.find(
      (f) => f.index === activeStream.fileIndex,
    );

    const finalStreamDetails = {
      ...activeStream.stream,
      behaviorHints: {
        ...activeStream.stream.behaviorHints,
        filename: activeFileStat?.path,
        videoSize: activeFileStat?.length,
      },
    };

    isSavingRef.current = true;
    try {
      await graphqlClient.request(UpdatePlaybackHistoryDocument, {
        input: {
          profileId,
          contentId: activeStream.contentId,
          itemType: activeStream.itemType,
          positionSeconds: isFinished ? 0 : Math.round(playerState.time),
          durationSeconds: Math.round(playerState.duration),
          // Send the fully enriched object
          lastStreamDetails: isFinished ? null : finalStreamDetails,
        },
      });
    } catch (error) {
      console.error("[PlayerProvider] Failed to save progress:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [player, selectedProfile, torrentStats]);

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

  const resumeStream = (historyItem: PlaybackHistoryItem) => {
    const streamToPlay = historyItem?.lastStreamDetails as Stream | undefined;
    const itemType = historyItem?.itemType;
    const startTime = historyItem?.positionSeconds ?? 0;
    const contentId = historyItem?.contentId;

    let title = "Untitled";
    let logo: string | null | undefined = null;
    if ("meta" in historyItem && historyItem.meta) {
      title = historyItem.meta.name;
      logo = historyItem.meta.logo;
    }

    if (streamToPlay && itemType && contentId) {
      void playStream(
        streamToPlay,
        title,
        logo ?? "",
        contentId,
        itemType,
        startTime,
      );
    } else {
      console.warn(
        "Resume failed: No last stream details found in the provided history item.",
      );
    }
  };

  const stop = useCallback(async () => {
    await saveProgress();
    player.actions.stop();
  }, [saveProgress, player.actions]);

  useEffect(() => {
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
            itemType: activeStream.itemType,
            positionSeconds: isFinished ? 0 : Math.round(playerState.time),
            durationSeconds: Math.round(playerState.duration),
            lastStreamDetails: isFinished ? null : activeStream.stream,
          },
        },
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
      playStream: (
        stream: Stream,
        title: string,
        logo: string | null,
        contentId: string,
        itemType: string,
      ) => playStream(stream, title, logo, contentId, itemType, 0),
      resumeStream,
      stop,
      togglePause: player.actions.togglePause,
      toggleFullscreen: player.actions.toggleFullscreen,
      seek: player.actions.seek,
      setVolume: player.actions.setVolume,
      toggleMute: player.actions.toggleMute,
      setAudioId: player.actions.setAudioId,
      setSubtitleId: player.actions.setSubtitleId,
      loadSubtitle: player.actions.loadSubtitle,
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
