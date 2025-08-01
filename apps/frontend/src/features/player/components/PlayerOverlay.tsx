"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerControls } from "./PlayerControls";
import { usePlayer } from "@/providers/PlayerProvider";

export function PlayerOverlay() {
  const { status, activeStream, errorMessage, actions, playerState } =
    usePlayer();
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleActivity = () => {
      setIsControlsVisible(true);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = setTimeout(
        () => setIsControlsVisible(false),
        3000,
      );
    };

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
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-transparent text-white"
      >
        {/* --- UI FOR THE NEW "preparing" STATE --- */}
        {status === "preparing" && (
          <div className="flex flex-col items-center gap-4">
            <PlayerHeader
              title={activeStream?.title ?? ""}
              onBack={actions.stop}
            />
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
                className="h-full w-full bg-transparent"
              >
                <PlayerHeader
                  title={activeStream?.title ?? ""}
                  onBack={actions.stop}
                />
                <PlayerControls playerState={playerState} actions={actions} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
