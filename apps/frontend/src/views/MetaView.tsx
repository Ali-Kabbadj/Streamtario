import { useMemo, useState, useEffect, useRef, type RefObject } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useMetaDetails } from "@/features/meta/hooks/useMetaDetails";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Clock,
  Youtube,
  Link as LinkIcon,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  VideoType,
  CastType,
  TrailerStreamType,
  LinkType,
  TrailerType,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { EpisodeCard } from "@/features/meta/components/EpisodeCard";
import { StreamPanel } from "@/features/meta/components/StreamPanel";
import { AnimatePresence, motion } from "framer-motion";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CastMemberCard } from "@/features/meta/components/CastMemberCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isTrailerModalOpen, setTrailerModalOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] =
    useState<TrailerStreamType | null>(null);

  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const castListRef = useRef<HTMLDivElement | null>(null);

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
    if (meta?.type !== "movie" || !meta.released) return true;
    const releaseDate = new Date(meta.released);
    return releaseDate <= new Date();
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
    return keys.includes(extrasKey)
      ? [...numericSeasons, extrasKey]
      : numericSeasons;
  }, [seasons]);

  const allTrailers = useMemo((): TrailerStreamType[] => {
    if (!meta) return [];

    const fromTrailers = ((meta.trailers as TrailerType[]) ?? [])
      .map((t) => ({
        __typename: "TrailerStreamType" as const,
        ytId: t.source,
        title: t.type ?? "Trailer",
      }))
      .filter(
        (t): t is TrailerStreamType => typeof t.ytId === "string" && !!t.ytId,
      );

    const fromStreams = (meta.trailerStreams as TrailerStreamType[]) ?? [];

    const uniqueTrailers = new Map<string, TrailerStreamType>();
    [...fromTrailers, ...fromStreams].forEach((trailer) => {
      if (trailer?.ytId) {
        uniqueTrailers.set(trailer.ytId, trailer);
      }
    });

    return Array.from(uniqueTrailers.values());
  }, [meta]);

  // --- EFFECTS ---
  useEffect(() => {
    if (seasonKeys.length > 0 && !selectedSeason) {
      setSelectedSeason(seasonKeys[0]);
    }
  }, [seasonKeys, selectedSeason]);

  // --- HANDLERS ---
  const handleEpisodeClick = (episode: Video) => {
    if (!meta) return;
    const episodeStreamId = `${meta.id}:${episode.season}:${episode.episode}`;
    setStreamPanelContent({
      itemType: "series",
      itemId: episodeStreamId,
      title: `S${episode.season} E${episode.episode}: ${episode.title}`,
      imageUrl: episode.thumbnail,
    });
  };

  const renderCast = () => {
    if (!meta?.appExtras?.cast || meta.appExtras.cast.length === 0) {
      return null;
    }
    return (
      <div className="mt-12 px-4 md:px-0">
        <h2 className="mb-4 text-2xl font-bold">Cast</h2>
        <div className="group relative">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-0 z-20 -translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => scrollHorizontally(castListRef, "left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div
            ref={castListRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto"
          >
            {meta.appExtras.cast.map((member: CastType, index: number) => (
              <CastMemberCard key={`${member.name}-${index}`} member={member} />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-0 z-20 translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => scrollHorizontally(castListRef, "right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
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

  const scrollHorizontally = (
    ref: RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
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

  // --- JSX ---

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex min-h-screen w-full"
      >
        {/* Background */}
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
                objectFit="cover"
                className="opacity-20"
                unoptimized
                priority
              />
            </motion.div>
            <div className="from-background via-background/80 fixed inset-0 z-[-1] bg-gradient-to-t to-transparent" />
          </>
        )}

        <motion.div
          animate={{ width: isPanelOpen ? "60%" : "100%" }}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.5 }}
          className="relative z-10 w-full"
        >
          <div className="container mx-auto pt-8 pb-12">
            <div className="mt-40 flex flex-col gap-8 px-4 md:flex-row md:items-end md:px-0">
              <div className="relative h-72 w-52 flex-shrink-0 self-center shadow-2xl md:self-end">
                <ImageWithFallback
                  src={meta.poster}
                  fallbackSrc="/images/NoImagePortrait.png"
                  alt={`${meta.name} poster`}
                  fill
                  className="rounded-lg"
                />
              </div>

              <div className="flex-grow space-y-4 py-4 text-center md:text-left">
                {meta.logo && (
                  <div className="relative h-24 w-auto self-center md:w-96 md:justify-center">
                    <ImageWithFallback
                      src={meta.logo}
                      fallbackSrc="" // Fallback is handled internally, but can't be null
                      alt={meta.name}
                      fill
                      className="object-center md:object-left"
                    />
                  </div>
                )}

                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {meta.name}
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-300 md:justify-start">
                  {meta.year && <span className="text-lg">{meta.year}</span>}
                  {meta.runtime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{meta.runtime}</span>
                    </div>
                  )}
                  {meta.country && <span>{meta.country}</span>}
                  {meta.imdbRating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-5 w-5 text-yellow-400" />
                      <span className="text-lg font-bold">
                        {meta.imdbRating}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                  {meta.genres?.map((genre, index) => (
                    <Badge key={`${genre}-${index}`} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions & Synopsis */}
            <div className="mt-8 grid grid-cols-1 gap-12 px-4 md:grid-cols-3 md:px-0">
              <div className="col-span-1 flex flex-col gap-4 md:col-span-2">
                <div className="flex flex-wrap gap-4">
                  {meta.type === "movie" && isMovieReleased && (
                    <Button onClick={handleMovieStreamsClick} size="lg">
                      <Clapperboard className="mr-2 h-5 w-5" />
                      View Sources
                    </Button>
                  )}
                  {allTrailers.length > 0 && (
                    <Button
                      onClick={() => {
                        if (allTrailers[0]) {
                          handleTrailerClick(allTrailers[0]);
                        }
                      }}
                      size="lg"
                      variant="outline"
                    >
                      <Youtube className="mr-2 h-5 w-5" />
                      Watch Trailer
                    </Button>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Synopsis</h2>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {meta.description}
                  </p>
                </div>
              </div>
              <div className="col-span-1 space-y-3">
                {meta.director && meta.director.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Director</h3>
                    <p className="text-muted-foreground">
                      {meta.director.join(", ")}
                    </p>
                  </div>
                )}
                {meta.writer && meta.writer.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Writers</h3>
                    <p className="text-muted-foreground">
                      {meta.writer.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cast */}
            {renderCast()}

            {/* Unreleased Movie Message */}
            {meta.type === "movie" && !isMovieReleased && (
              <div className="mt-12 px-4 md:px-0">
                <h2 className="mb-4 text-2xl font-bold">
                  <Clapperboard className="mr-3 inline-block h-6 w-6" />
                  Coming Soon
                </h2>
                <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
                  <p className="text-muted-foreground">
                    This movie has not been released yet. Sources will be
                    available after its release date.
                  </p>
                </div>
              </div>
            )}

            {/* Episodes */}
            {meta.type !== "movie" && seasonKeys.length > 0 && (
              <div className="mt-12 px-4 md:px-0">
                <h2 className="mb-4 text-2xl font-bold">
                  <Film className="mr-3 inline-block h-6 w-6" />
                  Episodes
                </h2>
                {selectedSeason && (
                  <Tabs
                    value={selectedSeason}
                    onValueChange={setSelectedSeason}
                    className="w-full"
                  >
                    <div className="group relative">
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-1/2 left-0 z-20 -translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => scrollHorizontally(tabsListRef, "left")}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div
                        ref={tabsListRef}
                        className="scrollbar-hide overflow-x-auto whitespace-nowrap"
                      >
                        <TabsList className="inline-flex h-auto">
                          {seasonKeys.map((seasonKey) => (
                            <TabsTrigger key={seasonKey} value={seasonKey}>
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
                        className="absolute top-1/2 right-0 z-20 translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => scrollHorizontally(tabsListRef, "right")}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <TabsContent value={selectedSeason} className="mt-4">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {seasons[selectedSeason]?.map((episode) => {
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
                  </Tabs>
                )}
              </div>
            )}

            {/* Links */}
            {meta.links && meta.links.length > 0 && (
              <div className="mt-12 px-4 md:px-0">
                <h2 className="mb-4 text-2xl font-bold">
                  <LinkIcon className="mr-3 inline-block h-6 w-6" />
                  Official Links
                </h2>
                <div className="flex flex-wrap gap-3">
                  {meta.links.map((link: LinkType, index: number) => (
                    <Button
                      key={`${link.url}-${index}`}
                      asChild
                      variant="outline"
                      className="bg-slate-800/50"
                    >
                      <a
                        href={link.url ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.name}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Side Panels */}
        <StreamPanel
          content={streamPanelContent}
          onClose={() => setStreamPanelContent(null)}
          logoUrl={meta.logo}
        />
        <Dialog open={isTrailerModalOpen} onOpenChange={setTrailerModalOpen}>
          <DialogContent className="h-auto max-w-4xl border-slate-700 bg-black">
            <DialogHeader>
              <DialogTitle>
                {selectedTrailer?.title ?? `${meta.name} Trailer`}
              </DialogTitle>
            </DialogHeader>
            {selectedTrailer?.ytId && (
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedTrailer.ytId}?autoplay=1`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
