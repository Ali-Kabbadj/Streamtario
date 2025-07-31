"use client";

import { useMpvPlayer } from "../hooks/useMpvPlayer";
import { motion, AnimatePresence } from "framer-motion";
import { Loader, XCircle, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Player() {
  const { status, activeStream, errorMessage, actions } = useMpvPlayer();

  if (status === "idle") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm"
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
          // In a real scenario, this overlay would be more complex,
          // but for now, we just show a stop button.
          // The actual controls are handled by MPV's native OSD.
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={actions.stop}
              className="h-12 w-12 rounded-full bg-black/50 hover:bg-black/70"
            >
              <XCircle className="h-8 w-8" />
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
