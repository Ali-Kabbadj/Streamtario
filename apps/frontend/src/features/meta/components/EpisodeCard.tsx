"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type {
  VideoType,
  GetPlaybackHistoryByImdbIdQuery,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CheckCircle2, Clapperboard, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];

interface EpisodeCardProps {
  episode: VideoType;
  onShowSources: () => void;
  onResume: () => void;
  isReleased: boolean;
  playbackHistory?: PlaybackHistoryItem;
}

export function EpisodeCard({
  episode,
  onShowSources,
  onResume,
  isReleased,
  playbackHistory,
}: EpisodeCardProps) {
  const progressPercent =
    playbackHistory && playbackHistory.durationSeconds > 0
      ? (playbackHistory.positionSeconds / playbackHistory.durationSeconds) *
        100
      : 0;

  const isWatched = progressPercent >= 95;
  const canResume = !!playbackHistory?.lastStreamDetails;

  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-lg p-2",
        isReleased ? "cursor-pointer" : "cursor-not-allowed opacity-50",
      )}
    >
      <AspectRatio
        ratio={16 / 9}
        className="relative flex-shrink-0 overflow-hidden rounded-md"
      >
        <ImageWithFallback
          className="h-full w-full object-cover"
          fallbackSrc={"/images/NoImageLandscape.png"}
          alt={"Episode thumbnail"}
          src={episode.thumbnail ?? ""}
          width={320}
          height={180}
        />
        {isWatched && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <CheckCircle2 className="h-16 w-16 text-white" />
          </div>
        )}
        {progressPercent > 0 && !isWatched && (
          <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-700">
            <div
              className="bg-primary h-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-2 text-center opacity-0 transition-opacity group-hover:opacity-100">
          {canResume ? (
            <Button onClick={onResume} className="w-full">
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
          ) : null}
          <Button
            onClick={onShowSources}
            variant={canResume ? "secondary" : "default"}
            className="w-full"
          >
            <Clapperboard className="mr-2 h-4 w-4" /> View Sources
          </Button>
        </div>
      </AspectRatio>
      <div className="flex-grow">
        <h4 className="truncate font-semibold">
          E{episode.episode} | {episode.title}
        </h4>
        <p className="text-sm text-slate-400">
          {episode.released?.substring(0, 10)}
        </p>
      </div>
    </motion.div>
  );
}
