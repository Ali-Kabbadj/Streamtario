"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";
import type { GetMetaDetailsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import ImageWithFallback from "@/components/shared/ImageWithFallback";

type Episode = NonNullable<
  NonNullable<NonNullable<GetMetaDetailsQuery["profile"]>["meta"]>["videos"]
>[0];

interface EpisodeCardProps {
  episode: Episode;
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <motion.div
      className="group flex cursor-pointer flex-col gap-2 overflow-hidden rounded-lg p-2 transition-colors"
      whileHover={{
        backgroundColor: "var(--accent)",
      }}
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
