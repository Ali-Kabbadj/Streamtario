// src/providers/PlayerProvider.tsx

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
import type {
  GetContinueWatchingQuery,
  GetPlaybackHistoryByImdbIdQuery,
  MetaItemType,
  SubtitleType,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { useHybridPlayer } from "@/features/player/hooks/useHybridPlayer";
import { useProfileContext } from "./profile-provider";
import { graphqlClient } from "@/lib/graphql-client";
import { UpdatePlaybackHistoryDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import { APP_CONFIG } from "@/config/env";
import { useSubtitles } from "@/features/player/hooks/useSubtitles";
import { useStreamDataResolver } from "@/features/player/hooks/useStreamDataResolver";
import { fetchClient } from "@/api/api-client";
import { constructMagnetUrl, type Stream } from "@/lib/stream-parser";
import { checkStreamingServiceHealth } from "@/features/player/services/streaming.service";
import type { PlayerActions } from "@/features/player/types";
import {
  isWebView,
  type PlayerState,
} from "@/features/player/hooks/useMpvPlayer";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import { BrowserPlayer } from "@/features/player/components/BrowserPlayer";
import { cn } from "@/lib/utils";

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

export interface HighLevelPlayerActions extends PlayerActions {
  playStream: (
    stream: Stream,
    title: string,
    logo: string | null,
    contentId: string,
    itemType: string,
    imdbId: string,
    metaId: string,
    startTime?: number,
    durationSeconds?: number,
  ) => void;
  resumeStream: (historyItem: PlaybackHistoryItem, meta?: MetaItemType) => void;
  stop: () => Promise<void>;
}

interface PlayerContextType {
  status: "idle" | "preparing" | "playing" | "error";
  errorMessage: string | null;
  rawStreamUrlOnError: string | null;
  activeStream: ActiveStream | null;
  playerState: PlayerState;
  actions: HighLevelPlayerActions;
  isPlaybackActive: boolean;
  externalSubtitles?: SubtitleType[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useHybridPlayer();
  const { selectedProfile } = useProfileContext();
  const [browserSrc, setBrowserSrc] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [serviceDownError, setServiceDownError] = useState<string | null>(null);
  const [rawStreamUrlOnError, setRawStreamUrlOnError] = useState<string | null>(
    null,
  );
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
      startTime: number,
      durationSeconds: number,
    ) => {
      try {
        await fetchClient(
          `${APP_CONFIG.NEXT_PUBLIC_STREAMING_SERVICE_URL}/setup-stream`,
          {
            method: "POST",
            body: JSON.stringify({
              infoHash,
              announce,
              fileIndex,
              startTime,
              durationSeconds,
            }),
          },
        );
        return true;
      } catch (error) {
        console.error("[PlayerProvider] Error setting up stream:", error);
        return false;
      }
    },
    [],
  );

  const cleanupStreamOnBackend = useCallback((infoHash: string) => {
    fetchClient(
      `${APP_CONFIG.NEXT_PUBLIC_STREAMING_SERVICE_URL}/cleanup/${infoHash}`,
      { method: "POST", keepalive: true },
    ).catch((err) => {
      console.error("Beacon cleanup failed:", err);
    });
  }, []);

  const saveProgress = useCallback(async () => {
    if (isSavingRef.current) return;
    const { playerState } = player;
    if (
      !activeStream ||
      !resolvedStreamData ||
      !selectedProfile?.id ||
      playerState.duration <= 0 ||
      !activeStream.imdbId
    )
      return;
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
  }, [player, activeStream, selectedProfile?.id, resolvedStreamData]);

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
      durationSeconds = 0,
    ) => {
      const start = async () => {
        setIsPreparing(true);
        setServiceDownError(null);
        setRawStreamUrlOnError(null);
        setActiveStream({
          stream,
          title,
          logo,
          contentId,
          itemType,
          imdbId,
          infoHash: stream.infoHash,
          fileIndex: stream.fileIdx,
          metaId,
        });

        const isServiceUp = await checkStreamingServiceHealth();
        if (!isServiceUp) {
          const rawMagnetUrl = constructMagnetUrl(
            stream.infoHash!,
            title,
            stream.announce,
            stream.fileIdx!,
          );
          setServiceDownError(
            "The local streaming service is not running. Please start it to play content.",
          );
          setRawStreamUrlOnError(rawMagnetUrl);
          setIsPreparing(false);
          return;
        }

        const { infoHash, fileIdx } = stream;
        if (!infoHash || fileIdx === null || typeof fileIdx === "undefined") {
          setIsPreparing(false);
          return;
        }
        const setupOk = await setupStreamOnBackend(
          infoHash,
          stream.announce,
          fileIdx,
          startTime,
          durationSeconds,
        );
        if (!setupOk) {
          setServiceDownError(
            "Failed to set up the stream with the local service.",
          );
          setIsPreparing(false);
          return;
        }

        const streamUrl = `${APP_CONFIG.NEXT_PUBLIC_STREAMING_SERVICE_URL}/direct/${infoHash}/${fileIdx}`;
        if (!player.isWebView) {
          setBrowserSrc(streamUrl);
        }
        player.actions.play(streamUrl, startTime, stream);

        if (player.playerState.isPaused && !isWebView()) {
          player.actions.togglePause();
        }
      };
      void start();
    },
    [setupStreamOnBackend, player],
  );

  const resumeStream = useCallback(
    (historyItem: PlaybackHistoryItem, meta?: MetaItemType) => {
      const streamToPlay = historyItem?.lastStreamDetails as Stream | undefined;
      if (!streamToPlay) return;
      const title = meta?.name ?? "Untitled";
      const logo = meta?.logo ?? null;
      const metaId = meta?.id ?? "unknown";

      playStream(
        streamToPlay,
        title,
        logo,
        historyItem.contentId,
        historyItem.itemType,
        historyItem.imdbId,
        metaId,
        historyItem.positionSeconds ?? 0,
        historyItem.durationSeconds ?? 0,
      );
    },
    [playStream],
  );

  const stop = useCallback(async () => {
    await saveProgress();
    if (activeStream?.infoHash) {
      cleanupStreamOnBackend(activeStream.infoHash);
    }
    await player.actions.stop();
    setActiveStream(null);
    setIsPreparing(false);
    setServiceDownError(null);
    setRawStreamUrlOnError(null);
  }, [saveProgress, activeStream, cleanupStreamOnBackend, player.actions]);

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
    if (
      isPreparing &&
      (player.hasPlaybackStarted || player.status === "error")
    ) {
      setIsPreparing(false);
    }
  }, [isPreparing, player.hasPlaybackStarted, player.status]);

  const finalStatus = useMemo(() => {
    if (serviceDownError) return "error";
    if (isPreparing && player.status !== "playing") return "preparing";
    return player.status;
  }, [serviceDownError, isPreparing, player.status]);

  const finalErrorMessage = serviceDownError ?? player.errorMessage;

  useEffect(() => {
    if (finalStatus !== "idle") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [finalStatus]);

  const isPlaybackActive =
    player.hasPlaybackStarted &&
    !player.playerState.isBuffering &&
    !player.playerState.isPaused;

  const value: PlayerContextType = {
    status: finalStatus,
    errorMessage: finalErrorMessage,
    rawStreamUrlOnError,
    activeStream,
    playerState: player.playerState,
    isPlaybackActive,
    externalSubtitles,
    actions: {
      ...player.actions,
      playStream,
      resumeStream,
      stop,
    },
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}

      {!player.isWebView && (
        <div
          className={cn(
            "fixed inset-0 z-[40] bg-black",
            (finalStatus === "idle" || !activeStream) && "hidden",
          )}
        >
          <BrowserPlayer ref={player.ref} src={browserSrc} />
        </div>
      )}

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
