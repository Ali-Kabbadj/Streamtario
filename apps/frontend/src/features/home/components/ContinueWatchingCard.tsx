"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { useView } from "@/providers/view-provider";
import { usePlayer } from "@/providers/PlayerProvider";
import type { GetContinueWatchingQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { Info, Play } from "lucide-react";

type ContinueWatchingItem = GetContinueWatchingQuery["continueWatching"][0];

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
}

export const ContinueWatchingCard = ({ item }: ContinueWatchingCardProps) => {
  const { navigateTo } = useView();
  const { actions } = usePlayer();

  const progressPercent =
    item.durationSeconds > 0
      ? (item.positionSeconds / item.durationSeconds) * 100
      : 0;

  const handleDetailsClick = () => {
    if (item.meta) {
      navigateTo({
        name: "meta",
        itemType: item.meta.type,
        itemId: item.meta.id,
      });
    }
  };

  const handleResumeClick = () => {
    actions.resumeStream(item.contentId);
  };

  if (!item.meta) {
    return null; // Or a fallback UI
  }

  return (
    <motion.div
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      layout
    >
      <AspectRatio ratio={2 / 3} onClick={handleDetailsClick}>
        <ImageWithFallback
          className="h-full w-full object-cover"
          fallbackSrc={"/images/NoImagePortrait.png"}
          alt={item.meta.name}
          src={item.meta.poster ?? ""}
          width={200}
          height={300}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-700/50">
          <div
            className="bg-primary h-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </AspectRatio>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
        <h3 className="text-center text-lg font-bold text-white">
          {item.meta.name}
        </h3>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={handleDetailsClick}>
            <Info className="mr-2 h-4 w-4" /> Details
          </Button>
          <Button onClick={handleResumeClick}>
            <Play className="mr-2 h-4 w-4" /> Resume
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
