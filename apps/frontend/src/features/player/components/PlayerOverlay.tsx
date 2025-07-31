"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerControls } from "./PlayerControls";
import { StreamingStatsDisplay } from "./StreamingStatsDisplay";
import { useStreamingServerStats } from "../hooks/useStreamingServerStats";
import { usePlayer } from "@/providers/PlayerProvider";

export function PlayerOverlay() {
  const { status, activeStream, errorMessage, actions, playerState } =
    usePlayer();
  const { stats } = useStreamingServerStats(activeStream?.infoHash ?? null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [activityTimeout, setActivityTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  useEffect(() => {
    const handleActivity = () => {
      setIsControlsVisible(true);
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      const newTimeout = setTimeout(() => setIsControlsVisible(false), 3000);
      setActivityTimeout(newTimeout);
    };

    if (status === "playing") {
      window.addEventListener("mousemove", handleActivity);
      handleActivity(); // Show controls initially
    }

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [status]);

  if (status === "idle") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex cursor-none flex-col items-center justify-center bg-black/80 text-white"
      >
        {status === "preparing" && (
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-12 w-12 animate-spin" />
            <h2 className="text-2xl font-bold">Preparing Stream...</h2>
            <p className="text-lg text-slate-300">{activeStream?.title}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 p-4 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-bold">Playback Error</h2>
            <p className="text-lg text-red-400">{errorMessage}</p>
            <Button variant="destructive" onClick={actions.stop}>
              Close
            </Button>
          </div>
        )}

        {status === "playing" && (
          <AnimatePresence>
            {isControlsVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <PlayerHeader
                  title={activeStream?.title ?? ""}
                  onBack={actions.stop}
                />
                <StreamingStatsDisplay stats={stats} />
                <PlayerControls playerState={playerState} actions={actions} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
