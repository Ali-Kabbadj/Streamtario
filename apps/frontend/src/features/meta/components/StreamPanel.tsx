"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStreams } from "../hooks/useStreams";
import { useProfileContext } from "@/providers/profile-provider";
import { StreamList } from "./StreamList";
import { X, ArrowUpDown, Filter } from "lucide-react";
import Image from "next/image";
import { parseStream, ParsedStreamDetails } from "@/lib/stream-parser";

type SortKey = "quality" | "seeders" | "size";
type SortDirection = "asc" | "desc";

const QUALITY_ORDER: Record<string, number> = {
  "4K": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  SD: 1,
};

interface StreamPanelContent {
  itemType: string;
  itemId: string;
  title: string;
  imageUrl?: string | null;
}

interface StreamPanelProps {
  content: StreamPanelContent | null;
  onClose: () => void;
}

export function StreamPanel({ content, onClose }: StreamPanelProps) {
  const { selectedProfile } = useProfileContext();
  const [sortKey, setSortKey] = useState<SortKey>("seeders");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: rawStreams, isLoading: isLoadingStreams } = useStreams({
    profileId: selectedProfile?.id ?? "",
    itemType: content?.itemType ?? "",
    itemId: content?.itemId ?? "",
    enabled: !!content,
  });

  const sortedAndParsedStreams = useMemo(() => {
    if (!rawStreams) return [];
    const parsed = rawStreams.map((s, i) => ({
      ...parseStream(s),
      originalIndex: i,
    }));
    return parsed.sort((a, b) => {
      let valA: number | null = null;
      let valB: number | null = null;

      if (sortKey === "quality") {
        valA = a.quality ? (QUALITY_ORDER[a.quality] ?? 0) : 0;
        valB = b.quality ? (QUALITY_ORDER[b.quality] ?? 0) : 0;
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
      }

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      const diff = sortDirection === "desc" ? valB - valA : valA - valB;
      if (diff === 0) {
        const seedA = a.seeders ?? -1;
        const seedB = b.seeders ?? -1;
        return seedB - seedA;
      }
      return diff;
    });
  }, [rawStreams, sortKey, sortDirection]);

  const originalSortedStreams = useMemo(() => {
    if (!rawStreams || !sortedAndParsedStreams) return [];
    return sortedAndParsedStreams.map((p) => rawStreams[p.originalIndex]);
  }, [sortedAndParsedStreams, rawStreams]);

  return (
    <AnimatePresence>
      {content && (
        <motion.div
          key={content.itemId}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card fixed top-16 right-0 z-20 flex h-[calc(100vh-4rem)] w-full flex-col border-l border-slate-700 shadow-2xl lg:w-1/3"
        >
          <div className="flex-shrink-0 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-grow pr-4">
                <h2 className="text-2xl font-bold">{content.title}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            {content.imageUrl && (
              <div className="relative mt-4 h-40 w-full">
                <Image
                  src={content.imageUrl}
                  alt={content.title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort by {sortKey}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortKey("seeders")}>
                    Seeders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey("quality")}>
                    Quality
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey("size")}>
                    Size
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" disabled>
                <Filter className="mr-2 h-4 w-4" />
                Filter (soon)
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto overscroll-y-contain px-4">
            <div className="pb-4">
              <StreamList
                streams={sortedAndParsedStreams}
                rawStreams={originalSortedStreams}
                isLoading={isLoadingStreams}
              />
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
