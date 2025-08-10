"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStreams } from "../hooks/useStreams";
import { useProfileContext } from "@/providers/profile-provider";
import { StreamList } from "./StreamList";
import { X, ArrowUpDown, Filter } from "lucide-react";
import Image from "next/image";
import {
  parseStream,
  type ParsedStreamDetails,
  type Stream,
} from "@/lib/stream-parser";
import { Label } from "@/components/ui/label";
import type { GetPlaybackHistoryByImdbIdQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];

type SortKey = "best" | "seeders" | "size";

interface StreamPanelContent {
  itemType: string;
  itemId: string;
  metaId: string;
  title: string;
  imageUrl?: string | null;
}

interface StreamPanelProps {
  content: StreamPanelContent | null;
  onClose: () => void;
  logoUrl?: string | null;
  itemType: string;
  imdbId: string;
  playbackHistory?: PlaybackHistoryItem;
}

interface Filters {
  resolution: Set<string>;
  source: Set<string>;
  hdr: Set<string>;
  language: Set<string>;
}

const QUALITY_SCORE = { "4K": 4, "1080p": 3, "720p": 2, SD: 1 };
const SOURCE_SCORE = { Remux: 4, BluRay: 3, "WEB-DL": 2, WEBRip: 1 };
const HDR_SCORE = { "Dolby Vision": 3, "HDR10+": 2, HDR: 1 };
const AUDIO_SCORE = {
  "Dolby Atmos": 5,
  "Dolby TrueHD": 4,
  "DTS-HD MA": 3,
  "DD+": 2,
};

const getStreamScore = (stream: ParsedStreamDetails) => {
  let score = 0;
  const { tags, seeders } = stream;
  score +=
    (QUALITY_SCORE[tags.quality as keyof typeof QUALITY_SCORE] || 0) * 1000;
  score += (SOURCE_SCORE[tags.source as keyof typeof SOURCE_SCORE] || 0) * 100;

  const hdrTag = tags.video.find((t) => HDR_SCORE[t as keyof typeof HDR_SCORE]);
  if (hdrTag) {
    score += (HDR_SCORE[hdrTag as keyof typeof HDR_SCORE] || 0) * 10;
  }

  for (const codec of tags.audio) {
    score += AUDIO_SCORE[codec as keyof typeof AUDIO_SCORE] || 0;
  }

  score += Math.log1p(seeders ?? 0);
  return score;
};

const FilterSection = ({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (option: string) => void;
}) => {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${title}-${option}`}
              checked={selected.has(option)}
              onCheckedChange={() => onToggle(option)}
            />
            <Label
              htmlFor={`${title}-${option}`}
              className="cursor-pointer text-sm leading-none font-normal"
            >
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export function StreamPanel({
  content,
  onClose,
  logoUrl,
  itemType,
  imdbId,
  playbackHistory,
}: StreamPanelProps) {
  const { selectedProfile } = useProfileContext();
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [filters, setFilters] = useState<Filters>({
    resolution: new Set<string>(),
    source: new Set<string>(),
    hdr: new Set<string>(),
    language: new Set<string>(),
  });

  const { data: rawStreams, isLoading: isLoadingStreams } = useStreams({
    profileId: selectedProfile?.id ?? "",
    itemType: content?.itemType ?? "",
    itemId: content?.itemId ?? "",
    enabled: !!content,
  }) as { data: Stream[] | undefined; isLoading: boolean };

  const parsedStreams = useMemo(() => {
    if (!rawStreams) return [];
    return rawStreams.map((s: Stream, i: number) => parseStream(s, i));
  }, [rawStreams]);

  const filterOptions = useMemo(() => {
    const resolutions = new Set<string>();
    const sources = new Set<string>();
    const hdrTypes = new Set<string>();
    const languages = new Set<string>();
    const hdrKeys = Object.keys(HDR_SCORE);

    parsedStreams.forEach((s: ParsedStreamDetails) => {
      if (s.tags.quality) resolutions.add(s.tags.quality);
      if (s.tags.source) sources.add(s.tags.source);
      s.tags.video.forEach((v: string) => {
        if (hdrKeys.includes(v)) hdrTypes.add(v);
      });
      s.tags.languages.forEach((l: string) => languages.add(l));
    });
    return {
      resolutions: Array.from(resolutions).sort(
        (a, b) =>
          (QUALITY_SCORE[b as keyof typeof QUALITY_SCORE] || 0) -
          (QUALITY_SCORE[a as keyof typeof QUALITY_SCORE] || 0),
      ),
      sources: Array.from(sources),
      hdrTypes: Array.from(hdrTypes),
      languages: Array.from(languages),
    };
  }, [parsedStreams]);

  const processedStreams = useMemo(() => {
    const filtered = parsedStreams.filter((stream: ParsedStreamDetails) => {
      const { tags } = stream;
      if (
        filters.resolution.size > 0 &&
        (!tags.quality || !filters.resolution.has(tags.quality))
      )
        return false;
      if (
        filters.source.size > 0 &&
        (!tags.source || !filters.source.has(tags.source))
      )
        return false;
      if (
        filters.hdr.size > 0 &&
        !tags.video.some((v: string) => filters.hdr.has(v))
      )
        return false;
      if (
        filters.language.size > 0 &&
        (tags.languages.length === 0 ||
          !tags.languages.some((l: string) => filters.language.has(l)))
      )
        return false;
      return true;
    });

    return filtered.sort((a: ParsedStreamDetails, b: ParsedStreamDetails) => {
      if (sortKey === "best") return getStreamScore(b) - getStreamScore(a);
      if (sortKey === "seeders") return (b.seeders ?? 0) - (a.seeders ?? 0);
      if (sortKey === "size")
        return (b.sizeInBytes ?? 0) - (a.sizeInBytes ?? 0);
      return 0;
    });
  }, [parsedStreams, sortKey, filters]);

  const handleFilterToggle = (category: keyof Filters, option: string) => {
    setFilters((prev) => {
      const newSet = new Set(prev[category]);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return { ...prev, [category]: newSet };
    });
  };

  const clearFilters = () =>
    setFilters({
      resolution: new Set(),
      source: new Set(),
      hdr: new Set(),
      language: new Set(),
    });
  const activeFilterCount = (
    Object.values(filters) as Array<Set<string>>
  ).reduce((acc: number, current: Set<string>) => acc + current.size, 0);

  const contentId = content?.itemId ?? "";
  const metaId = content?.metaId ?? "";

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          key={content.itemId}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card fixed top-16 right-0 z-20 flex h-[calc(100vh-4rem)] w-full flex-col border-l border-slate-700 shadow-2xl lg:w-1/3"
        >
          <div className="flex-shrink-0 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-grow pr-4">
                <h2 className="text-2xl font-bold">{content.title}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            {content.imageUrl && (
              <div className="relative mt-4 h-40 w-full">
                <Image
                  src={content.imageUrl}
                  alt={content.title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="capitalize">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort by {sortKey}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortKey("best")}>
                    Best Match
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey("seeders")}>
                    Seeders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey("size")}>
                    Size
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="bg-primary ml-2 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-4">
                  <FilterSection
                    title="Resolution"
                    options={filterOptions.resolutions}
                    selected={filters.resolution}
                    onToggle={(opt) => handleFilterToggle("resolution", opt)}
                  />
                  <FilterSection
                    title="Source"
                    options={filterOptions.sources}
                    selected={filters.source}
                    onToggle={(opt) => handleFilterToggle("source", opt)}
                  />
                  <FilterSection
                    title="HDR"
                    options={filterOptions.hdrTypes}
                    selected={filters.hdr}
                    onToggle={(opt) => handleFilterToggle("hdr", opt)}
                  />
                  <FilterSection
                    title="Language"
                    options={filterOptions.languages}
                    selected={filters.language}
                    onToggle={(opt) => handleFilterToggle("language", opt)}
                  />
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto overscroll-y-contain px-4">
            <div className="pb-4">
              <StreamList
                streams={processedStreams}
                rawStreams={rawStreams}
                isLoading={isLoadingStreams}
                clearFilters={clearFilters}
                mediaTitle={content.title}
                logoUrl={logoUrl}
                contentId={contentId}
                metaId={metaId}
                itemType={itemType}
                imdbId={imdbId}
                lastStreamDetails={playbackHistory?.lastStreamDetails}
                positionSeconds={playbackHistory?.positionSeconds}
                durationSeconds={playbackHistory?.durationSeconds}
              />
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
