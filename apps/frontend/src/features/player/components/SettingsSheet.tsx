"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, AudioLines, Captions } from "lucide-react";
import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TrackItem {
  id: string | number;
  label: string;
  description?: string;
  lang: string;
  source: string; // "Embedded" or Addon Name
}

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  audioTracks: TrackItem[];
  subtitleTracks: TrackItem[];
  selectedAudioId?: number;
  selectedSubtitleId?: number;
  onSelectAudio: (id: number) => void;
  onSelectSubtitle: (track: TrackItem) => void;
}

type View =
  | { type: "main" }
  | { type: "audio" }
  | { type: "subtitles_lang" }
  | { type: "subtitles_track"; lang: string };

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

export function SettingsSheet({
  isOpen,
  onOpenChange,
  audioTracks,
  subtitleTracks,
  selectedAudioId,
  selectedSubtitleId,
  onSelectAudio,
  onSelectSubtitle,
}: SettingsSheetProps) {
  const [view, setView] = useState<View>({ type: "main" });
  const [direction, setDirection] = useState(1);

  const groupedSubtitles = useMemo(() => {
    const map = new Map<string, TrackItem[]>();
    for (const sub of subtitleTracks) {
      const lang = sub.lang || "Unknown";
      if (!map.has(lang)) map.set(lang, []);
      map.get(lang)!.push(sub);
    }
    return map;
  }, [subtitleTracks]);

  const navigateTo = (newView: View) => {
    setDirection(1);
    setView(newView);
  };

  const navigateBack = () => {
    setDirection(-1);
    if (view.type === "subtitles_track") {
      setView({ type: "subtitles_lang" });
    } else {
      setView({ type: "main" });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => setView({ type: "main" }), 200); // Reset view on close
    }
    onOpenChange(open);
  };

  const renderContent = () => {
    const currentViewType = view.type;

    return (
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={
            currentViewType === "subtitles_track"
              ? `${view.type}-${view.lang}`
              : view.type
          }
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
          className="absolute top-0 left-0 h-full w-full"
        >
          <SheetHeader
            className={cn("flex-row items-center space-y-0", {
              "justify-between": view.type !== "main",
            })}
          >
            {view.type !== "main" && (
              <Button variant="ghost" size="icon" onClick={navigateBack}>
                <ChevronLeft />
              </Button>
            )}
            <SheetTitle className="flex-grow text-center">
              {
                {
                  main: "Player Settings",
                  audio: "Audio Tracks",
                  subtitles_lang: "Subtitle Languages",
                  subtitles_track: `Subtitles (${view.type === "subtitles_track" ? view.lang : ""})`,
                }[view.type]
              }
            </SheetTitle>
            {view.type !== "main" && <div className="w-10" />}
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-4rem)]">
            <div className="space-y-2 p-4">
              {view.type === "main" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start py-6"
                    onClick={() => navigateTo({ type: "audio" })}
                  >
                    <AudioLines className="mr-4" /> Audio Tracks
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start py-6"
                    onClick={() => navigateTo({ type: "subtitles_lang" })}
                  >
                    <Captions className="mr-4" /> Subtitles
                  </Button>
                </>
              )}

              {view.type === "audio" &&
                audioTracks.map((track) => (
                  <Button
                    key={track.id}
                    variant="ghost"
                    className="h-auto w-full flex-col items-start"
                    onClick={() => onSelectAudio(track.id as number)}
                  >
                    <div className="flex w-full items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedAudioId === track.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="truncate">{track.label}</span>
                    </div>
                    <span className="text-muted-foreground ml-6 truncate text-xs">
                      {track.description}
                    </span>
                  </Button>
                ))}

              {view.type === "subtitles_lang" && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() =>
                      onSelectSubtitle({
                        id: -1,
                        label: "None",
                        lang: "",
                        source: "None",
                      })
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selectedSubtitleId === -1 ? "opacity-100" : "opacity-0",
                      )}
                    />
                    None
                  </Button>
                  {Array.from(groupedSubtitles.keys()).map((lang) => (
                    <Button
                      key={lang}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() =>
                        navigateTo({ type: "subtitles_track", lang })
                      }
                    >
                      {lang}
                    </Button>
                  ))}
                </>
              )}

              {view.type === "subtitles_track" &&
                groupedSubtitles.get(view.lang)?.map((track) => (
                  <Button
                    key={track.id}
                    variant="ghost"
                    className="h-auto w-full flex-col items-start"
                    onClick={() => onSelectSubtitle(track)}
                  >
                    <div className="flex w-full items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedSubtitleId === track.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="truncate">{track.label}</span>
                    </div>
                    <span className="text-muted-foreground ml-6 truncate text-xs">
                      {track.source}
                    </span>
                  </Button>
                ))}
            </div>
          </ScrollArea>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="overflow-hidden p-0">
        <div className="relative h-full w-full">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
