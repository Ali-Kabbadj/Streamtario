"use client";

import { useState, useEffect, useRef, useMemo, type RefObject } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  VideoType,
  GetPlaybackHistoryByImdbIdQuery,
  MetaItemType, // --- 1. IMPORT MetaItemType ---
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { EpisodeCard } from "../components/EpisodeCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";

type Video = VideoType;
type GroupedVideos = Record<string, Video[]>;
type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];
type PlaybackHistoryMap = Map<string, PlaybackHistoryItem>;

// --- 2. UPDATE THE PROPS INTERFACE ---
interface MetaEpisodesProps {
  videos: (Video | null)[] | null | undefined;
  onEpisodeClick: (episode: Video) => void;
  // Add a function to handle resuming from the parent
  onResumeEpisode: (
    historyItem: PlaybackHistoryItem,
    meta: MetaItemType,
  ) => void;
  playbackHistoryMap: PlaybackHistoryMap;
  meta: MetaItemType; // Accept the full meta object
  initialSeason?: string;
}

export function MetaEpisodes({
  videos,
  onEpisodeClick,
  onResumeEpisode, // Use the new resume handler
  playbackHistoryMap,
  meta, // Use the full meta object
  initialSeason,
}: MetaEpisodesProps) {
  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const initialSeasonSet = useRef(false);

  const seasons = useMemo(() => {
    if (!videos) return {};
    return (videos ?? []).reduce((acc: GroupedVideos, video) => {
      if (!video) return acc;
      const seasonKey =
        video.season === 0 ? "extras" : (video.season ?? 1).toString();
      acc[seasonKey] ??= [];
      acc[seasonKey].push(video);
      return acc;
    }, {});
  }, [videos]);

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

  useEffect(() => {
    if (initialSeasonSet.current) {
      return;
    }

    if (initialSeason && seasonKeys.includes(initialSeason)) {
      setSelectedSeason(initialSeason);
      initialSeasonSet.current = true;
    } else if (seasonKeys.length > 0 && !selectedSeason) {
      setSelectedSeason(seasonKeys[0]);
      initialSeasonSet.current = true;
    }
  }, [seasonKeys, initialSeason, selectedSeason]);

  const scrollHorizontally = (
    ref: RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // --- 3. REMOVE THE OLD handleResumeEpisode function ---
  // This logic is now handled in MetaView.tsx, which has the correct context.

  if (!videos || videos.length === 0 || seasonKeys.length === 0) {
    return null;
  }

  return (
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
                    {seasonKey === "extras" ? "Extras" : `Season ${seasonKey}`}
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

                const historyKey = `${episode.season}:${episode.episode}`;
                const history = playbackHistoryMap.get(historyKey);

                return (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    isReleased={isReleased}
                    onShowSources={() => onEpisodeClick(episode)}
                    onResume={() => history && onResumeEpisode(history, meta)}
                    playbackHistory={history}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
