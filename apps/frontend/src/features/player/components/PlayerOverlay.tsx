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

  // --- ETA-Driven Animation Logic ---
  const progressControls = useAnimationControls();
  const etaRef = useRef(activeTorrentStats?.bufferingEtaSeconds);

  useEffect(() => {
    const newEta = activeTorrentStats?.bufferingEtaSeconds;
    // Only update the animation if the new ETA is significantly different,
    // to prevent jerky movements.
    if (newEta !== undefined && newEta !== etaRef.current) {
      etaRef.current = newEta;
      void progressControls.start({
        width: "100%",
        transition: { duration: newEta, ease: "linear" },
      });
    }
    // If buffering is done (no ETA), instantly set to 100%
    if (
      activeTorrentStats &&
      newEta === undefined &&
      activeTorrentStats.preloaded_bytes > 0
    ) {
      progressControls.set({ width: "100%" });
    }
  }, [activeTorrentStats, progressControls]);

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
    !hasPlaybackStarted || playerState.isBuffering || playerState.isPaused;

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
                  {/* Pass the animation controls down to the splash component */}
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
