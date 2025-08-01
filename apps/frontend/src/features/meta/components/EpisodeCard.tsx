"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import type { VideoType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import ImageWithFallback from "@/components/shared/ImageWithFallback";

interface EpisodeCardProps {
  episode: VideoType;
  onClick: () => void;
  isReleased: boolean;
}

export function EpisodeCard({
  episode,
  onClick,
  isReleased,
}: EpisodeCardProps) {
  return (
    <motion.div
      onClick={isReleased ? onClick : undefined}
      className={cn(
        "group flex flex-col gap-2 overflow-hidden rounded-lg p-2 transition-colors",
        isReleased ? "cursor-pointer" : "cursor-not-allowed opacity-50",
      )}
      whileHover={isReleased ? { backgroundColor: "var(--accent)" } : {}}
    >
      <AspectRatio ratio={16 / 9} className="flex-shrink-0">
        <ImageWithFallback
          className="h-full w-full rounded-md object-cover"
          fallbackSrc={"/images/NoImageLandscape.png"}
          alt={"Episode thumbnail"}
          src={episode.thumbnail ?? ""}
          width={320}
          height={180}
        />
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
