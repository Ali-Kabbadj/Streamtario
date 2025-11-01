"use client";

import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  MetaItemType,
  TrailerStreamType,
  GetPlaybackHistoryByImdbIdQuery, // CORRECTED IMPORT
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { usePlayer } from "@/providers/PlayerProvider";
import {
  Clapperboard,
  Clock,
  Star,
  Youtube,
  CheckCircle2,
  Play,
} from "lucide-react";

type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];

interface MetaHeaderProps {
  meta: MetaItemType;
  allTrailers: TrailerStreamType[];
  isMovieReleased: boolean;
  onViewSources: () => void;
  onWatchTrailer: (trailer: TrailerStreamType) => void;
  playbackHistory?: PlaybackHistoryItem; // CORRECTED PROP TYPE
}

export function MetaHeader({
  meta,
  allTrailers,
  isMovieReleased,
  onViewSources,
  onWatchTrailer,
  playbackHistory,
}: MetaHeaderProps) {
  const { actions } = usePlayer();

  const progressPercent =
    playbackHistory && playbackHistory.durationSeconds > 0
      ? (playbackHistory.positionSeconds / playbackHistory.durationSeconds) *
        100
      : 0;
  const isWatched = progressPercent >= 95;
  const canResume = !!playbackHistory?.lastStreamDetails;

  const handleResumeClick = () => {
    if (meta.id && playbackHistory) {
      actions.resumeStream(playbackHistory, meta);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-x-8 px-4 md:flex-row md:items-end md:px-0">
        <div className="relative h-72 w-52 flex-shrink-0 self-center shadow-2xl md:self-end">
          <ImageWithFallback
            src={meta.poster}
            fallbackSrc="/images/NoImagePortrait.png"
            alt={`${meta.name} poster`}
            fill
            className="rounded-lg"
          />
          {isWatched && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <CheckCircle2 className="h-24 w-24 text-white" />
            </div>
          )}
        </div>
        <div className="flex-grow space-y-4 py-4 text-center md:text-left">
          {meta.logo && (
            <div className="relative h-24 w-auto self-center md:w-96 md:justify-center">
              <ImageWithFallback
                src={meta.logo}
                fallbackSrc=""
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
                <span className="text-lg font-bold">{meta.imdbRating}</span>
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
      <div className="mt-8 px-4 md:px-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            {meta.type === "movie" && isMovieReleased && canResume && (
              <Button onClick={handleResumeClick} size="lg">
                <Play className="mr-2 h-5 w-5" />
                Resume
              </Button>
            )}
            {meta.type === "movie" && isMovieReleased && (
              <Button
                onClick={onViewSources}
                size="lg"
                variant={canResume ? "secondary" : "default"}
              >
                <Clapperboard className="mr-2 h-5 w-5" />
                View Sources
              </Button>
            )}
            {allTrailers.length > 0 && allTrailers[0] && (
              <Button
                onClick={() => onWatchTrailer(allTrailers[0]!)}
                size="lg"
                variant="outline"
              >
                <Youtube className="mr-2 h-5 w-5" />
                Watch Trailer
              </Button>
            )}
          </div>
          {progressPercent > 0 && !isWatched && (
            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full rounded-full bg-slate-700">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
