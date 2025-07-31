import { useMemo, useState, useEffect, useRef } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useMetaDetails } from "@/features/meta/hooks/useMetaDetails";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star, Clapperboard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VideoType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { EpisodeCard } from "@/features/meta/components/EpisodeCard";
import { StreamPanel } from "@/features/meta/components/StreamPanel";
import { motion } from "framer-motion";

interface MetaViewProps {
  itemType: string;
  itemId: string;
}

type Video = VideoType;
type GroupedVideos = Record<string, Video[]>;

interface StreamPanelContent {
  itemType: string;
  itemId: string;
  title: string;
  imageUrl?: string | null;
}

export function MetaView({ itemType, itemId }: MetaViewProps) {
  const { selectedProfile } = useProfileContext();
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();
  const [streamPanelContent, setStreamPanelContent] =
    useState<StreamPanelContent | null>(null);

  const tabsListRef = useRef<HTMLDivElement>(null);

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

  const isMovieReleased = useMemo(() => {
    if (meta?.type !== "movie" || !meta.releaseInfo) return true;
    const releaseYear = parseInt(meta.releaseInfo.substring(0, 4));
    return releaseYear <= new Date().getFullYear();
  }, [meta]);

  const seasons = useMemo(() => {
    if (!meta?.videos) return {};
    return (meta.videos ?? []).reduce((acc: GroupedVideos, video) => {
      const seasonKey =
        video.season === 0 ? "extras" : (video.season ?? 1).toString();
      acc[seasonKey] ??= [];
      acc[seasonKey].push(video);
      return acc;
    }, {});
  }, [meta?.videos]);

  const seasonKeys = useMemo(() => {
    const keys = Object.keys(seasons);
    const extrasKey = "extras";

    const numericSeasons = keys
      .filter((key) => key !== extrasKey)
      .sort((a, b) => parseInt(a) - parseInt(b));

    if (keys.includes(extrasKey)) {
      return [...numericSeasons, extrasKey];
    }

    return numericSeasons;
  }, [seasons]);

  useEffect(() => {
    if (seasonKeys.length > 0 && !selectedSeason) {
      setSelectedSeason(seasonKeys[0]);
    }
  }, [seasonKeys, selectedSeason]);

  const handleEpisodeClick = (episode: Video) => {
    if (!meta) return;
    // =================================================================
    // THE CRITICAL FIX: USE THE FULL, UNMODIFIED SERIES ID
    // =================================================================
    const episodeStreamId = `${meta.id}:${episode.season}:${episode.episode}`;
    // =================================================================
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

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsListRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      tabsListRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const isPanelOpen = !!streamPanelContent;

  if (isLoadingMeta) {
    return (
      <div className="relative z-10 container mx-auto pt-8">
        <div className="mt-40 flex items-end gap-8 px-8">
          <Skeleton className="h-64 w-48 flex-shrink-0 rounded-lg" />
          <div className="flex-grow space-y-4 pb-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
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

  return (
    <div className="relative flex min-h-screen w-full">
      {meta.background && (
        <>
          <div className="fixed inset-0 z-[-1] h-full w-full">
            <Image
              src={meta.background}
              alt={`${meta.name} background`}
              layout="fill"
              objectFit="cover"
              className="opacity-40"
              unoptimized
            />
          </div>
          <div className="from-background via-background/60 fixed inset-0 z-[-1] bg-gradient-to-t to-transparent" />
        </>
      )}

      <motion.div
        animate={{ width: isPanelOpen ? "66.66%" : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full"
      >
        <div className="container mx-auto pt-8 pb-12">
          <div className="mt-40 flex flex-col gap-8 md:flex-row md:items-end">
            <div className="relative h-72 w-52 flex-shrink-0 self-center md:self-end">
              <Image
                src={meta.poster ?? ""}
                alt={`${meta.name} poster`}
                layout="fill"
                objectFit="cover"
                className="rounded-lg shadow-2xl"
                unoptimized
              />
            </div>
            <div className="flex-grow space-y-3 py-4 text-center md:text-left">
              <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                {meta.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <span className="text-lg text-slate-400">
                  {meta.releaseInfo}
                </span>
                {meta.imdb_id && (
                  <>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-400" />
                      <span className="text-lg font-bold">{meta.imdb_id}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                {meta.genres?.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 max-w-4xl">
            {meta.type === "movie" && isMovieReleased && (
              <Button onClick={handleMovieStreamsClick} size="lg">
                <Clapperboard className="mr-2 h-5 w-5" />
                View Streaming Sources
              </Button>
            )}
          </div>
          <div className="mt-12 max-w-4xl">
            <h2 className="text-2xl font-bold">Synopsis</h2>
            <p className="text-muted-foreground mt-2 text-lg">
              {meta.description}
            </p>
          </div>
          {meta.type === "movie" && !isMovieReleased && (
            <div className="mt-12">
              <h2 className="mb-4 text-2xl font-bold">Streaming Sources</h2>
              <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
                <p className="text-muted-foreground">
                  This movie is not yet released. Sources will be available
                  soon.
                </p>
              </div>
            </div>
          )}
          {meta.type !== "movie" && seasonKeys.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-2xl font-bold">Episodes</h2>
              <Tabs
                value={selectedSeason}
                onValueChange={setSelectedSeason}
                className="w-full"
              >
                <div className="group relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 left-0 z-20 -translate-x-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => scrollTabs("left")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div
                    ref={tabsListRef}
                    className="scrollbar-hide overflow-x-auto whitespace-nowrap"
                  >
                    <TabsList className="inline-flex h-auto">
                      {seasonKeys.map((seasonKey) => (
                        <TabsTrigger
                          key={seasonKey}
                          value={seasonKey}
                          className="flex-shrink-0"
                        >
                          {seasonKey === "extras"
                            ? "Extras"
                            : `Season ${seasonKey}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 right-0 z-20 translate-x-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => scrollTabs("right")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {selectedSeason && seasons[selectedSeason] && (
                  <TabsContent value={selectedSeason} className="mt-4">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {seasons[selectedSeason].map((episode) => {
                        const isReleased =
                          new Date(episode.released ?? 0) <= new Date();
                        return (
                          <EpisodeCard
                            key={episode.id}
                            episode={episode}
                            isReleased={isReleased}
                            onClick={() => handleEpisodeClick(episode)}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>
      </motion.div>
      <StreamPanel
        content={streamPanelContent}
        onClose={() => setStreamPanelContent(null)}
      />
    </div>
  );
}
