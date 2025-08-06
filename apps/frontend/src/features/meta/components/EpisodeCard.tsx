"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type {
  VideoType,
  GetPlaybackHistoryQuery,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CheckCircle2 } from "lucide-react";

interface EpisodeCardProps {
  episode: VideoType;
  onClick: () => void;
  isReleased: boolean;
  playbackHistory?: GetPlaybackHistoryQuery["playbackHistory"][0];
}

export function EpisodeCard({
  episode,
  onClick,
  isReleased,
  playbackHistory,
}: EpisodeCardProps) {
  const progressPercent =
    playbackHistory && playbackHistory.durationSeconds > 0
      ? (playbackHistory.positionSeconds / playbackHistory.durationSeconds) *
        100
      : 0;

  const isWatched = progressPercent >= 95;

  return (
    <motion.div
      onClick={isReleased ? onClick : undefined}
      className={cn(
        "group flex flex-col gap-2 overflow-hidden rounded-lg p-2 transition-colors",
        isReleased ? "cursor-pointer" : "cursor-not-allowed opacity-50",
      )}
      whileHover={isReleased ? { backgroundColor: "var(--accent)" } : {}}
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
