"use client";

import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerControls } from "./PlayerControls";
import { usePlayer } from "@/providers/PlayerProvider";
import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
import { PreparingSplash } from "./PreparingSplash";

export function PlayerOverlay() {
  const {
    status,
    activeStream,
    errorMessage,
    actions,
    playerState,
    hasPlaybackStarted,
  } = usePlayer();
  const { stats } = useStreamingServerStats();
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeTorrentStats =
    stats?.find((t) => t.hash === activeStream?.infoHash) ?? null;

  const progressControls = useAnimationControls();
  const lastAnimationState = useRef<"determinate" | "indeterminate" | "idle">(
    "idle",
  );

  // Main animation logic effect
  useEffect(() => {
    // Determine the current required state for the splash screen
    const isInitialBuffering = !hasPlaybackStarted;
    const isSeekBuffering = hasPlaybackStarted && playerState.isBuffering;
    const shouldShowBufferingSplash = isInitialBuffering || isSeekBuffering;

    if (!shouldShowBufferingSplash) {
      // If no splash is needed, stop all animations and hide the bar
      if (lastAnimationState.current !== "idle") {
        progressControls.stop();
        progressControls.set({ width: "0%" });
        lastAnimationState.current = "idle";
      }
      return;
    }

    // --- Case 1: Mid-playback (Seek) Buffering ---
    // We show an indeterminate, pulsing animation because we can't measure progress.
    if (isSeekBuffering) {
      // Only start the animation if it's not already running
      if (lastAnimationState.current !== "indeterminate") {
        lastAnimationState.current = "indeterminate";
        void progressControls.start({
          width: ["30%", "70%"], // Animate back and forth
          transition: {
            duration: 1,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          },
        });
      }
    }
    // --- Case 2: Initial Buffering ---
    // We show a determinate progress bar filling up to 99%.
    else if (isInitialBuffering && activeTorrentStats) {
      lastAnimationState.current = "determinate";

      const bufferGoal =
        activeTorrentStats.preload_size > 0
          ? activeTorrentStats.preload_size
          : 25 * 1024 * 1024; // 25MB default

      const loadedBytes = activeTorrentStats.preloaded_bytes;
      const rawProgress = bufferGoal > 0 ? loadedBytes / bufferGoal : 0;
      const cappedProgress = Math.min(rawProgress, 0.99); // Cap at 99%
      const progressPercentage = cappedProgress * 100;

      void progressControls.start({
        width: `${progressPercentage}%`,
        transition: { type: "tween", ease: "linear", duration: 0.4 },
      });
    }
  }, [
    activeTorrentStats,
    hasPlaybackStarted,
    playerState.isBuffering,
    progressControls,
  ]);

  // Once playback actually starts, we force the bar to 100% to finish the animation
  useEffect(() => {
    if (hasPlaybackStarted) {
      void progressControls.start({
        width: "100%",
        transition: { duration: 0.2 },
      });
    }
  }, [hasPlaybackStarted, progressControls]);

  useEffect(() => {
    const handleActivity = () => {
      setIsControlsVisible(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      if (hasPlaybackStarted) {
        activityTimeoutRef.current = setTimeout(
          () => setIsControlsVisible(false),
          3000,
        );
      }
    };

    if (
      !hasPlaybackStarted ||
      playerState.isPaused ||
      playerState.isBuffering
    ) {
      setIsControlsVisible(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    }

    if (status === "playing") {
      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("click", handleActivity);
      const onMouseLeave = () => setIsControlsVisible(false);
      document.documentElement.addEventListener("mouseleave", onMouseLeave);
      handleActivity();

      return () => {
        window.removeEventListener("mousemove", handleActivity);
        window.removeEventListener("click", handleActivity);
        document.documentElement.removeEventListener(
          "mouseleave",
          onMouseLeave,
        );
        if (activityTimeoutRef.current)
          clearTimeout(activityTimeoutRef.current);
      };
    }
  }, [
    status,
    hasPlaybackStarted,
    playerState.isPaused,
    playerState.isBuffering,
  ]);

  if (status === "idle") {
    return null;
  }

  const shouldShowBufferingSplash =
    !hasPlaybackStarted || playerState.isBuffering;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-transparent text-white"
      >
        {status === "error" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black p-4 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-bold">Playback Error</h2>
            <p className="text-lg text-red-400">{errorMessage}</p>
            <Button variant="destructive" onClick={actions.stop}>
              Close
            </Button>
          </div>
        )}

        {status === "playing" && (
          <>
            <AnimatePresence>
              {shouldShowBufferingSplash && (
                <motion.div
                  key="buffering-splash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80"
                >
                  <PreparingSplash
                    logoUrl={activeStream?.logo}
                    animationControls={progressControls}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isControlsVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 h-full w-full"
                >
                  <PlayerHeader
                    title={activeStream?.title ?? ""}
                    onBack={actions.stop}
                  />
                  <PlayerControls playerState={playerState} actions={actions} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
