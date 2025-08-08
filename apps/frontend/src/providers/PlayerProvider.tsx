"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import type {
  GetContinueWatchingQuery,
  GetPlaybackHistoryByImdbIdQuery,
  SubtitleType,
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
import type { Stream } from "@/features/meta/types";
import { useSubtitles } from "@/features/player/hooks/useSubtitles";
import { useStreamDataResolver } from "@/features/player/hooks/useStreamDataResolver";
import { fetchClient } from "@/api/api-client";

type PlaybackHistoryItem =
  | NonNullable<
      NonNullable<GetContinueWatchingQuery["profile"]>["continueWatching"]
    >[0]
  | NonNullable<GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"]>[0];

interface ActiveStream {
  stream: Stream;
  infoHash: string | null | undefined;
  fileIndex: number | null | undefined;
  title: string;
  logo?: string | null;
  contentId: string;
  metaId: string;
  itemType: string;
  imdbId: string;
}

interface PlayerActions {
  playStream: (
    stream: Stream,
    title: string,
    logo: string | null,
    contentId: string,
    itemType: string,
    imdbId: string,
    metaId: string,
  ) => void;
  resumeStream: (historyItem: PlaybackHistoryItem) => void;
  stop: () => Promise<void>;
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
  activeStream: ActiveStream | null;
  playerState: PlayerState;
  actions: PlayerActions;
  isPlaybackActive: boolean;
  externalSubtitles?: SubtitleType[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const gatewayUrl = new URL(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL);
const streamingApiUrl = `${gatewayUrl.origin}/api/v1/stream`;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { actions: mpvActions, ...mpvState } = useMpvPlayer();
  const { selectedProfile } = useProfileContext();
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const isSavingRef = useRef(false);

  const resolvedStreamData = useStreamDataResolver(activeStream);

  const { data: externalSubtitles } = useSubtitles({
    contentId: resolvedStreamData?.contentId,
    itemType: resolvedStreamData?.itemType,
    filename: resolvedStreamData?.filename,
    videoSize: resolvedStreamData?.videoSize,
    videoHash: resolvedStreamData?.videoHash,
    enabled: !!resolvedStreamData,
  });

  const setupStreamOnBackend = useCallback(
    async (
      infoHash: string,
      announce: readonly string[] | null | undefined,
      fileIndex: number,
    ) => {
      try {
        await fetchClient("/api/v1/stream/setup-stream", {
          method: "POST",
          body: JSON.stringify({ infoHash, announce, fileIndex }),
        });
        return true;
      } catch (error) {
        console.error("[PlayerProvider] Error setting up stream:", error);
        return false;
      }
    },
    [],
  );

  const cleanupStreamOnBackend = useCallback((infoHash: string) => {
    fetchClient(`/api/v1/stream/cleanup/${infoHash}`, {
      method: "POST",
      keepalive: true,
    }).catch((err) => {
      console.error("Beacon cleanup failed:", err);
    });
  }, []);

  const saveProgress = useCallback(async () => {
    if (isSavingRef.current) return;
    const { playerState } = mpvState;
    if (
      !activeStream ||
      !resolvedStreamData ||
      !selectedProfile?.id ||
      playerState.duration <= 0 ||
      !activeStream.imdbId
    ) {
      return;
    }
    const isFinished = playerState.time / playerState.duration >= 0.95;

    const finalStreamDetails = {
      ...activeStream.stream,
      behaviorHints: {
        ...activeStream.stream.behaviorHints,
        filename: resolvedStreamData.filename,
        videoSize: resolvedStreamData.videoSize,
      },
    };

    isSavingRef.current = true;
    try {
      await graphqlClient.request(UpdatePlaybackHistoryDocument, {
        input: {
          profileId: selectedProfile.id,
          contentId: activeStream.contentId,
          itemType: activeStream.itemType,
          positionSeconds: isFinished ? 0 : Math.round(playerState.time),
          durationSeconds: Math.round(playerState.duration),
          lastStreamDetails: isFinished ? null : finalStreamDetails,
          imdbId: activeStream.imdbId,
        },
      });
    } catch (error) {
      console.error("[PlayerProvider] Failed to save progress:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [mpvState, activeStream, selectedProfile?.id, resolvedStreamData]);

  const playStream = useCallback(
    (
      stream: Stream,
      title: string,
      logo: string | null,
      contentId: string,
      itemType: string,
      imdbId: string,
      metaId: string,
      startTime = 0,
    ) => {
      const start = async () => {
        const { infoHash, fileIdx } = stream;
        if (!infoHash || fileIdx === null || typeof fileIdx === "undefined") {
          return;
        }

        const setupOk = await setupStreamOnBackend(
          infoHash,
          stream.announce,
          fileIdx,
        );
        if (!setupOk) {
          return;
        }

        setActiveStream({
          stream,
          title,
          logo,
          contentId,
          itemType,
          imdbId,
          infoHash,
          fileIndex: fileIdx,
          metaId,
        });

        const streamUrl = `${streamingApiUrl}/direct/${infoHash}/${fileIdx}`;
        mpvActions.play(streamUrl, startTime, stream);
      };
      void start();
    },
    [setupStreamOnBackend, mpvActions],
  );

  const resumeStream = useCallback(
    (historyItem: PlaybackHistoryItem) => {
      const streamToPlay = historyItem?.lastStreamDetails as Stream | undefined;
      if (!streamToPlay) {
        return;
      }
      const title =
        "meta" in historyItem && historyItem.meta
          ? historyItem.meta.name
          : "Untitled";
      const logo =
        "meta" in historyItem && historyItem.meta
          ? historyItem.meta.logo
          : null;

      const metaId =
        historyItem.itemType === "series"
          ? historyItem.contentId.split(":").slice(0, -2).join(":")
          : historyItem.contentId;

      playStream(
        streamToPlay,
        title,
        logo ?? "",
        historyItem.contentId,
        historyItem.itemType,
        historyItem.imdbId,
        metaId,
        historyItem.positionSeconds ?? 0,
      );
    },
    [playStream],
  );

  const stop = useCallback(async () => {
    await saveProgress();
    if (activeStream?.infoHash) {
      cleanupStreamOnBackend(activeStream.infoHash);
    }
    mpvActions.stop();
    setActiveStream(null);
  }, [saveProgress, activeStream, mpvActions, cleanupStreamOnBackend]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeStream?.infoHash) {
        cleanupStreamOnBackend(activeStream.infoHash);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (activeStream?.infoHash) {
        cleanupStreamOnBackend(activeStream.infoHash);
      }
    };
  }, [activeStream, cleanupStreamOnBackend]);

  useEffect(() => {
    if (mpvState.status === "playing" || mpvState.status === "error") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [mpvState.status]);

  const isPlaybackActive =
    mpvState.hasPlaybackStarted &&
    !mpvState.playerState.isBuffering &&
    !mpvState.playerState.isPaused;

  const value: PlayerContextType = {
    status: mpvState.status,
    errorMessage: mpvState.errorMessage,
    activeStream,
    playerState: mpvState.playerState,
    isPlaybackActive,
    externalSubtitles,
    actions: {
      playStream,
      resumeStream,
      stop,
      togglePause: mpvActions.togglePause,
      toggleFullscreen: mpvActions.toggleFullscreen,
      seek: mpvActions.seek,
      setVolume: mpvActions.setVolume,
      toggleMute: mpvActions.toggleMute,
      setAudioId: mpvActions.setAudioId,
      setSubtitleId: mpvActions.setSubtitleId,
      loadSubtitle: mpvActions.loadSubtitle,
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
