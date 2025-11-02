"use client";

import { motion, AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerControls } from "./PlayerControls";
import { usePlayer } from "@/providers/PlayerProvider";
import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
import { PreparingSplash, type AnimationState } from "./PreparingSplash";
import { ServiceDownOverlay } from "./ServiceDownOverlay";

export function PlayerOverlay() {
  const {
    status,
    activeStream,
    errorMessage,
    rawStreamUrlOnError,
    actions,
    playerState,
    isPlaybackActive,
  } = usePlayer();
  const { stats } = useStreamingServerStats();
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeTorrentStats =
    stats?.find((t) => t.hash === activeStream?.infoHash) ?? null;

  useEffect(() => {
    const handleActivity = () => {
      setIsControlsVisible(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      if (isPlaybackActive) {
        activityTimeoutRef.current = setTimeout(
          () => setIsControlsVisible(false),
          3000,
        );
      }
    };

    if (!isPlaybackActive) {
      setIsControlsVisible(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    }

    if (status === "playing") {
      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("click", handleActivity);
      const onMouseLeave = () =>
        !playerState.isPaused && setIsControlsVisible(false);
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
  }, [status, isPlaybackActive, playerState.isPaused]);

  if (status === "idle") {
    return null;
  }

  const hasStarted = playerState.time > 0;
  let animationState: AnimationState = "playing";
  if (hasStarted && playerState.isPaused && !playerState.isBuffering) {
    animationState = "paused";
  } else if (hasStarted && playerState.isBuffering) {
    animationState = "seeking";
  } else if (!hasStarted) {
    animationState = "initial";
  }

  const shouldShowSplash =
    status === "preparing" ||
    (status === "playing" && animationState !== "playing");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center text-white"
      >
        {status === "error" && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black p-4">
            {rawStreamUrlOnError ? (
              <ServiceDownOverlay
                message={errorMessage ?? "An unknown error occurred."}
                streamUrl={rawStreamUrlOnError}
                onClose={actions.stop}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <XCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-2xl font-bold">Playback Error</h2>
                <p className="text-lg text-red-400">{errorMessage}</p>
                <Button variant="destructive" onClick={actions.stop}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}

        {(status === "preparing" || status === "playing") && (
          <>
            <AnimatePresence>
              {shouldShowSplash && (
                <motion.div
                  key="splash-screen"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80"
                >
                  <PreparingSplash
                    logoUrl={activeStream?.logo}
                    torrentStats={activeTorrentStats}
                    animationState={
                      status === "preparing" ? "initial" : animationState
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {(status === "preparing" || status === "playing") && (
              <AnimatePresence>
                {isControlsVisible && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-auto absolute inset-0 z-30 flex h-full w-full flex-col justify-between"
                  >
                    <PlayerHeader
                      title={activeStream?.title ?? ""}
                      onBack={actions.stop}
                    />
                    <PlayerControls />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
