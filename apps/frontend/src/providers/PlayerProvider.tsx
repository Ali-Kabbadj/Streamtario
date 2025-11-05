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
import { type PlayerState } from "@/features/player/hooks/useMpvPlayer";
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import { BrowserPlayer } from "@/features/player/components/BrowserPlayer";
import { cn } from "@/lib/utils";
import { useStreamingServerStats } from "@/features/player/hooks/useStreamingServerStats";

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
  startTime: number;
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
  const { stats: streamingStats } = useStreamingServerStats();
  const [browserSrc, setBrowserSrc] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [serviceDownError, setServiceDownError] = useState<string | null>(null);
  const [rawStreamUrlOnError, setRawStreamUrlOnError] = useState<string | null>(
    null,
  );
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const isSavingRef = useRef(false);
  const [unsupportedFormatError, setUnsupportedFormatError] = useState<
    string | null
  >(null);

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
      sources: readonly string[] | null | undefined,
      fileIndex: number,
      startTime: number,
      durationSeconds: number,
    ) => {
      try {
        await fetchClient(`${APP_CONFIG.NEXT_PUBLIC_TORRSERVER_URL}/torrents`, {
          method: "POST",
          body: JSON.stringify({
            action: "add",
            link: infoHash,
            announce: sources,
            file_idx: fileIndex,
            start_time: startTime,
            duration: durationSeconds,
          }),
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
    fetchClient(`${APP_CONFIG.NEXT_PUBLIC_TORRSERVER_URL}/torrents`, {
      method: "POST",
      body: JSON.stringify({ action: "cleanup", hash: infoHash }),
      keepalive: true,
    }).catch((err) => {
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
      isSavingRef.current = false;
      console.error("[PlayerProvider] Failed to save progress:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [player, activeStream, selectedProfile?.id, resolvedStreamData]);

  useEffect(() => {
    if (!isPreparing || !activeStream?.infoHash) return;

    const activeTorrentStats = streamingStats.find(
      (t) => t.hash === activeStream.infoHash,
    );

    if (activeTorrentStats) {
      const isHeaderReady =
        activeTorrentStats.preloaded_bytes >= 2 * 1024 * 1024;

      if (isHeaderReady) {
        console.log(
          "[PlayerProvider] Initial header/buffer is ready. Starting playback.",
        );

        const streamUrl = `${APP_CONFIG.NEXT_PUBLIC_TORRSERVER_URL}/stream/${activeStream.infoHash}/${activeStream.fileIndex}`;

        if (!player.isWebView) {
          setBrowserSrc(streamUrl);
        }

        player.actions.play(
          streamUrl,
          activeStream.startTime,
          activeStream.stream,
        );
        setIsPreparing(false);
      }
    }
  }, [isPreparing, activeStream, streamingStats, player]);

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
        setUnsupportedFormatError(null);
        const isServiceUp = await checkStreamingServiceHealth();
        if (!isServiceUp) {
          const rawMagnetUrl = constructMagnetUrl(
            stream.infoHash!,
            title,
            stream.sources,
            stream.fileIdx!,
          );
          setServiceDownError(
            "The local streaming daemon is not running. Please start it to play content.",
          );
          setRawStreamUrlOnError(rawMagnetUrl);
          setIsPreparing(false);
          return;
        }

        const { infoHash, fileIdx } = stream;
        if (!infoHash || fileIdx === null || typeof fileIdx === "undefined") {
          console.error("playStream called with invalid infoHash or fileIdx");
          setIsPreparing(false);
          return;
        }

        const setupOk = await setupStreamOnBackend(
          infoHash,
          stream.sources,
          fileIdx,
          startTime,
          durationSeconds,
        );

        if (!setupOk) {
          setServiceDownError(
            "Failed to set up the stream with the local daemon.",
          );
          setIsPreparing(false);
          return;
        }
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
          startTime,
        });
        // ** FIX END **
      };
      void start();
    },
    [setupStreamOnBackend],
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
    setUnsupportedFormatError(null);
    setBrowserSrc(null);
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
      player.isWebView ||
      player.status !== "error" ||
      !activeStream ||
      serviceDownError ||
      unsupportedFormatError
    ) {
      return;
    }

    const error = player.errorMessage?.toLowerCase() ?? "";
    const isMediaError =
      error.includes("media_err_src_not_supported") ||
      error.includes("media_err_decode") ||
      error.includes("failed to load");

    if (isMediaError) {
      const { infoHash, fileIdx } = activeStream.stream;
      const streamUrl = `${APP_CONFIG.NEXT_PUBLIC_TORRSERVER_URL}/stream/${infoHash}/${fileIdx}`;

      setRawStreamUrlOnError(streamUrl);
      setUnsupportedFormatError(
        "This video format may not be supported for direct browser playback.",
      );
    }
  }, [
    player.status,
    player.errorMessage,
    activeStream,
    player.isWebView,
    serviceDownError,
    unsupportedFormatError,
  ]);

  const finalStatus = useMemo(() => {
    if (serviceDownError || unsupportedFormatError) return "error";
    if (
      isPreparing ||
      (player.status === "playing" && !player.hasPlaybackStarted)
    )
      return "preparing";
    return player.status;
  }, [
    serviceDownError,
    isPreparing,
    player.status,
    player.hasPlaybackStarted,
    unsupportedFormatError,
  ]);

  const finalErrorMessage =
    unsupportedFormatError ?? serviceDownError ?? player.errorMessage;

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
