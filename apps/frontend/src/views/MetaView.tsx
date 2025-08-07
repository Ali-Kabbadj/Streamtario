"use client";

import { useState, useMemo, useEffect } from "react"; // Added useEffect
import { useProfileContext } from "@/providers/profile-provider";
import { usePlayer } from "@/providers/PlayerProvider";
import { useMetaDetails } from "@/features/meta/hooks/useMetaDetails";
import { useQuery } from "@tanstack/react-query";
import { GetPlaybackHistoryByImdbIdDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import { graphqlClient } from "@/lib/graphql-client";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import type {
  VideoType,
  TrailerStreamType,
  GetPlaybackHistoryByImdbIdQuery,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { StreamPanel } from "@/features/meta/components/StreamPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";

import { MetaHeader } from "@/features/meta/layout/MetaHeader";
import { MetaSynopsis } from "@/features/meta/layout/MetaSynopsis";
import { MetaCast } from "@/features/meta/layout/MetaCast";
import { MetaEpisodes } from "@/features/meta/layout/MetaEpisodes";
import { MetaLinks } from "@/features/meta/layout/MetaLinks";

interface MetaViewProps {
  itemType: string;
  itemId: string;
}

interface StreamPanelContent {
  itemType: string;
  itemId: string;
  title: string;
  imageUrl?: string | null;
}

type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];
type PlaybackHistoryMap = Map<string, PlaybackHistoryItem>;

export function MetaView({ itemType, itemId }: MetaViewProps) {
  const { selectedProfile } = useProfileContext();
  const { status: playerStatus } = usePlayer();
  const [streamPanelContent, setStreamPanelContent] =
    useState<StreamPanelContent | null>(null);
  const [isTrailerModalOpen, setTrailerModalOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] =
    useState<TrailerStreamType | null>(null);
  const [initialSeason, setInitialSeason] = useState<string | undefined>(
    undefined,
  );

  const {
    data: meta,
    isLoading: isLoadingMeta,
    isError,
    error,
  } = useMetaDetails({
    profileId: selectedProfile?.id ?? "",
    itemType: itemType,
    itemId: itemId,
  });

  const { data: playbackHistoryData } = useQuery({
    queryKey: [
      "playbackHistory",
      selectedProfile?.id,
      meta?.imdbId,
      playerStatus,
    ],
    queryFn: async () => {
      if (!meta?.imdbId || !selectedProfile?.id) return null;
      return graphqlClient.request(GetPlaybackHistoryByImdbIdDocument, {
        profileId: selectedProfile.id,
        imdbId: meta.imdbId,
      });
    },
    enabled: !!selectedProfile?.id && !!meta?.imdbId,
  });

  const playbackHistoryMap = useMemo<PlaybackHistoryMap>(() => {
    const historyList = playbackHistoryData?.playbackHistoryByImdbId;
    if (!historyList) return new Map();

    const historyMap: PlaybackHistoryMap = new Map();
    for (const item of historyList) {
      const key =
        item.itemType === "movie" ? "movie" : `${item.season}:${item.episode}`;
      if (key) {
        historyMap.set(key, item);
      }
    }
    return historyMap;
  }, [playbackHistoryData]);

  // EFFECT TO DETERMINE THE INITIAL SEASON TO DISPLAY
  useEffect(() => {
    if (
      meta?.type === "series" &&
      playbackHistoryData?.playbackHistoryByImdbId
    ) {
      const history = playbackHistoryData.playbackHistoryByImdbId;
      if (history.length > 0) {
        // Find the item with the highest season number in the history
        const lastWatchedItem = history.reduce((latest, current) => {
          if (!current.season) return latest;
          if (!latest || (latest.season && current.season > latest.season)) {
            return current;
          }
          return latest;
        }, history[0]);

        if (lastWatchedItem?.season) {
          setInitialSeason(lastWatchedItem.season.toString());
        }
      }
    }
  }, [meta, playbackHistoryData]);

  const handleEpisodeClick = (episode: VideoType) => {
    if (!meta) return;
    const episodeStreamId = `${meta.id}:${episode.season}:${episode.episode}`;
    setStreamPanelContent({
      itemType: "series",
      itemId: episodeStreamId,
      title: `S${episode.season} E${episode.episode}: ${episode.title}`,
      imageUrl: episode.thumbnail,
    });
  };

  const handleMovieStreamsClick = () => {
    if (!meta) return;
    setStreamPanelContent({
      itemType: "movie",
      itemId: meta.id,
      title: `${meta.name} | Sources`,
      imageUrl: meta.poster,
    });
  };

  const handleTrailerClick = (trailer: TrailerStreamType) => {
    setSelectedTrailer(trailer);
    setTrailerModalOpen(true);
  };

  const isPanelOpen = !!streamPanelContent;

  if (isLoadingMeta) {
    return (
      <div className="relative z-10 container mx-auto pt-8">
        <div className="mt-40 flex items-end gap-8 px-8">
          <Skeleton className="h-72 w-52 flex-shrink-0 rounded-lg" />
          <div className="flex-grow space-y-4 pb-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">Error: {error?.message}</div>
    );
  }

  if (!meta) {
    return <div className="text-center">Content not found.</div>;
  }

  const isMovieReleased =
    meta.type !== "movie" ||
    !meta.released ||
    new Date(meta.released) <= new Date();

  const allTrailers = [
    ...(meta.trailers?.map((t) => ({
      __typename: "TrailerStreamType" as const,
      ytId: t.source,
      title: t.type ?? "Trailer",
    })) ?? []),
    ...(meta.trailerStreams ?? []),
  ].filter((t): t is TrailerStreamType => !!t?.ytId);

  const movieHistory =
    meta.type === "movie" ? playbackHistoryMap.get("movie") : undefined;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex min-h-screen w-full"
      >
        {meta.background && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="fixed inset-0 z-[-1] h-full w-full"
            >
              <Image
                src={meta.background}
                alt={`${meta.name} background`}
                fill
                className="object-cover opacity-20"
                unoptimized
                priority
              />
            </motion.div>
            <div className="from-background via-background/80 fixed inset-0 z-[-1] bg-gradient-to-t to-transparent" />
          </>
        )}

        <motion.div
          animate={{ width: isPanelOpen ? "66.66%" : "100%" }}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
          className="relative z-10 w-full"
        >
          <div className="container mx-auto pt-8 pb-12">
            <MetaHeader
              meta={meta}
              allTrailers={allTrailers}
              isMovieReleased={isMovieReleased}
              onViewSources={handleMovieStreamsClick}
              onWatchTrailer={handleTrailerClick}
              playbackHistory={movieHistory}
            />
            <MetaSynopsis meta={meta} />
            <MetaCast cast={meta.appExtras?.cast} />
            {meta.type !== "movie" && (
              <MetaEpisodes
                videos={meta.videos}
                onEpisodeClick={handleEpisodeClick}
                playbackHistoryMap={playbackHistoryMap}
                metaId={meta.id}
                metaLogo={meta.logo}
                initialSeason={initialSeason}
              />
            )}
            <MetaLinks links={meta.links} />
          </div>
        </motion.div>

        <StreamPanel
          content={streamPanelContent}
          onClose={() => setStreamPanelContent(null)}
          logoUrl={meta.logo}
          itemType={itemType}
        />

        <Dialog open={isTrailerModalOpen} onOpenChange={setTrailerModalOpen}>
          <DialogContent className="h-auto max-w-4xl border-slate-700 bg-black p-0">
            {selectedTrailer?.ytId && (
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedTrailer.ytId}?autoplay=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
}
