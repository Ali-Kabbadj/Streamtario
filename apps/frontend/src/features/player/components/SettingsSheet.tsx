"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, AudioLines, Captions } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLanguageName } from "@/lib/language-utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface TrackItem {
  id: string | number;
  label: string;
  description?: string;
  lang: string;
  source: string;
}

interface SettingsSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  audioTracks: TrackItem[];
  subtitleTracks: TrackItem[];
  selectedAudioId?: number;
  selectedSubtitleId?: number | string;
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
  const [lastSelectedSubId, setLastSelectedSubId] = useState<
    string | number | undefined
  >();

  useEffect(() => {
    if (selectedSubtitleId && selectedSubtitleId !== -1) {
      setLastSelectedSubId(selectedSubtitleId);
    }
  }, [selectedSubtitleId]);

  const groupedSubtitles = useMemo(() => {
    const map = new Map<string, TrackItem[]>();
    for (const sub of subtitleTracks) {
      const lang = sub.lang || "unk";
      const langName = getLanguageName(lang);
      if (!map.has(langName)) map.set(langName, []);
      map.get(langName)!.push(sub);
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
      setTimeout(() => setView({ type: "main" }), 200);
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
            className={cn("flex-row items-center space-y-0 p-4", {
              "justify-between": view.type !== "main",
            })}
          >
            {view.type !== "main" && (
              <Button variant="ghost" size="icon" onClick={navigateBack}>
                <ChevronLeft />
              </Button>
            )}
            <SheetTitle className="flex-grow text-center text-lg font-semibold">
              {
                {
                  main: "Player Settings",
                  audio: "Audio Tracks",
                  subtitles_lang: "Subtitles",
                  subtitles_track: `Subtitles (${
                    view.type === "subtitles_track" ? view.lang : ""
                  })`,
                }[view.type]
              }
            </SheetTitle>
            {view.type !== "main" && <div className="w-10" />}
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="space-y-1 p-4">
              {view.type === "main" && (
                <>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start py-4 text-left"
                    onClick={() => navigateTo({ type: "audio" })}
                  >
                    <AudioLines className="mr-4 h-5 w-5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span>Audio Tracks</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {audioTracks.find((t) => t.id === selectedAudioId)
                          ?.label ?? "Default"}
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start py-4 text-left"
                    onClick={() => navigateTo({ type: "subtitles_lang" })}
                  >
                    <Captions className="mr-4 h-5 w-5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span>Subtitles</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {selectedSubtitleId === -1 || !selectedSubtitleId
                          ? "None"
                          : getLanguageName(
                              subtitleTracks.find(
                                (t) => t.id === selectedSubtitleId,
                              )?.lang ?? "",
                            )}
                      </span>
                    </div>
                  </Button>
                </>
              )}

              {view.type === "audio" &&
                audioTracks.map((track) => (
                  <Button
                    key={track.id}
                    variant="ghost"
                    className="h-auto w-full flex-col items-start justify-center py-2 text-left"
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
                    {track.description && (
                      <span className="text-muted-foreground ml-6 truncate text-xs">
                        {track.description}
                      </span>
                    )}
                  </Button>
                ))}

              {view.type === "subtitles_lang" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-lg p-3">
                    <Label htmlFor="subtitles-enabled" className="font-medium">
                      Enable Subtitles
                    </Label>
                    <Switch
                      id="subtitles-enabled"
                      checked={
                        selectedSubtitleId !== -1 && !!selectedSubtitleId
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const idToSelect =
                            lastSelectedSubId ??
                            (subtitleTracks.length > 0
                              ? subtitleTracks[0]?.id
                              : undefined);
                          const trackToSelect = subtitleTracks.find(
                            (t) => t.id === idToSelect,
                          );
                          if (trackToSelect) {
                            onSelectSubtitle(trackToSelect);
                          } else if (subtitleTracks.length > 0) {
                            onSelectSubtitle(subtitleTracks[0]);
                          }
                        } else {
                          onSelectSubtitle({
                            id: -1,
                            label: "None",
                            lang: "",
                            source: "None",
                          });
                        }
                      }}
                    />
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-1 transition-opacity",
                      selectedSubtitleId === -1 || !selectedSubtitleId
                        ? "pointer-events-none opacity-50"
                        : "",
                    )}
                  >
                    {Array.from(groupedSubtitles.keys()).map((lang) => (
                      <Button
                        key={lang}
                        variant="ghost"
                        className="w-full justify-start py-3"
                        onClick={() =>
                          navigateTo({ type: "subtitles_track", lang })
                        }
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {view.type === "subtitles_track" &&
                groupedSubtitles.get(view.lang)?.map((track) => (
                  <Button
                    key={track.id}
                    variant="ghost"
                    className="h-auto w-full flex-col items-start justify-center py-2 text-left"
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
