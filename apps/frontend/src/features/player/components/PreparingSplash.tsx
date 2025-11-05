"use client";

import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";
import type { TorrentStats } from "../hooks/useStreamingServerStats";
import { useEffect, useState } from "react";

export type AnimationState = "initial" | "seeking" | "paused" | "playing";

interface PreparingSplashProps {
  logoUrl?: string | null;
  torrentStats: TorrentStats | null;
  animationState: AnimationState;
}

const INITIAL_BUFFER_GOAL_BYTES = 25 * 1024 * 1024;

export function PreparingSplash({
  logoUrl,
  torrentStats,
  animationState,
}: PreparingSplashProps) {
  const progressControls = useAnimationControls();
  const [lastProgress, setLastProgress] = useState(0);

  useEffect(() => {
    switch (animationState) {
      case "paused":
        void progressControls.start({
          width: "100%",
          transition: { duration: 0.1, ease: "linear" },
        });
        break;

      case "seeking":
        void progressControls.start({
          width: ["30%", "70%"],
          transition: {
            duration: 1,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          },
        });
        break;

      case "initial":
        if (torrentStats) {
          const loadedBytes =
            typeof torrentStats.preloaded_bytes === "number"
              ? torrentStats.preloaded_bytes
              : 0;
          const rawProgress = loadedBytes / INITIAL_BUFFER_GOAL_BYTES;
          const progressPercentage = Math.min(rawProgress, 1) * 100;

          if (!isNaN(progressPercentage) && progressPercentage > lastProgress) {
            setLastProgress(progressPercentage);
            void progressControls.start({
              width: `${progressPercentage}%`,
              transition: { type: "tween", ease: "linear", duration: 0.4 },
            });
          }
        } else {
          progressControls.set({ width: "0%" });
        }
        break;

      case "playing":
        void progressControls.start({
          width: "100%",
          transition: { duration: 0.2, ease: "easeOut" },
        });
        break;
    }
  }, [animationState, torrentStats, progressControls, lastProgress]);

  if (!logoUrl) {
    return <div className="text-xl font-semibold">Loading...</div>;
  }

  return (
    <div className="relative h-48 w-96">
      <Image
        src={logoUrl}
        alt="Loading media background"
        fill
        className="object-contain opacity-30 grayscale filter"
        unoptimized
        priority
      />
      <motion.div
        className="absolute top-0 left-0 h-full overflow-hidden"
        initial={{ width: "0%" }}
        animate={progressControls}
      >
        <div className="relative h-48 w-96">
          <Image
            src={logoUrl}
            alt="Loading media foreground"
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}
