"use client";

import { Badge } from "@/components/ui/badge";
import {
  Users,
  HardDrive,
  Clapperboard,
  Film,
  Video,
  Sparkles,
  Sigma,
  Droplets,
  Volume2,
  Tv,
  Play,
  Wifi,
} from "lucide-react";
import type { ParsedStreamDetails, Stream } from "@/lib/stream-parser";
import type { JSX } from "react";
import { usePlayer } from "@/providers/PlayerProvider";
import type {
  GetPlaybackHistoryByImdbIdQuery,
  MetaItemType,
} from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type PlaybackHistoryItem =
  GetPlaybackHistoryByImdbIdQuery["playbackHistoryByImdbId"][0];

interface StreamItemProps {
  stream: Stream;
  parsed: ParsedStreamDetails;
  mediaTitle: string;
  contentId: string;
  meta: MetaItemType | null;
  playbackHistory?: PlaybackHistoryItem;
  isLastPlayedStream: boolean;
}

const tagIcons: Record<string, JSX.Element> = {
  "4K": <Film className="mr-1.5 h-3.5 w-3.5" />,
  "2K": <Film className="mr-1.5 h-3.5 w-3.5" />,
  "1080p": <Film className="mr-1.5 h-3.5 w-3.5" />,
  "720p": <Film className="mr-1.5 h-3.5 w-3.5" />,
  SD: <Tv className="mr-1.5 h-3.5 w-3.5" />,
  Remux: <Sigma className="mr-1.5 h-3.5 w-3.5" />,
  BluRay: <Clapperboard className="mr-1.5 h-3.5 w-3.5" />,
  "WEB-DL": <Clapperboard className="mr-1.5 h-3.5 w-3.5" />,
  WEBRip: <Clapperboard className="mr-1.5 h-3.5 w-3.5" />,
  "Dolby Vision": <Sparkles className="mr-1.5 h-3.5 w-3.5" />,
  "HDR10+": <Sparkles className="mr-1.5 h-3.5 w-3.5" />,
  HDR: <Sparkles className="mr-1.5 h-3.5 w-3.5" />,
  AV1: <Video className="mr-1.5 h-3.5 w-3.5" />,
  "H.265": <Video className="mr-1.5 h-3.5 w-3.5" />,
  "H.264": <Video className="mr-1.5 h-3.5 w-3.5" />,
  "10bit": <Droplets className="mr-1.5 h-3.5 w-3.5" />,
  "Dolby Atmos": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
  "Dolby TrueHD": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
  "DTS-HD MA": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
  "DD+": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
  "7.1": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
  "5.1": <Volume2 className="mr-1.5 h-3.5 w-3.5" />,
};

const DetailBadge = ({ tag }: { tag: string }) => {
  const icon = tagIcons[tag] ?? null;
  return (
    <Badge variant="secondary" className="flex items-center">
      {icon}
      <span>{tag}</span>
    </Badge>
  );
};

export function StreamItem({
  stream,
  parsed,
  mediaTitle,
  contentId,
  meta,
  playbackHistory,
  isLastPlayedStream,
}: StreamItemProps) {
  const progress =
    isLastPlayedStream &&
    playbackHistory?.durationSeconds &&
    playbackHistory.positionSeconds
      ? {
          position: playbackHistory.positionSeconds,
          duration: playbackHistory.durationSeconds,
        }
      : undefined;

  const { actions } = usePlayer();
  const { tags } = parsed;
  const progressPercent = progress
    ? (progress.position / progress.duration) * 100
    : 0;
  const allTags = [
    tags.quality,
    tags.source,
    ...tags.video,
    ...tags.audio,
    ...tags.languages,
    ...tags.other,
  ].filter(Boolean) as string[];
  const handlePlayClick = () => {
    if (!meta) return;

    if (isLastPlayedStream && playbackHistory) {
      actions.resumeStream(playbackHistory, meta);
      return;
    }

    const startTime = playbackHistory?.positionSeconds ?? 0;
    actions.playStream(
      stream,
      mediaTitle,
      meta.logo ?? "",
      contentId,
      meta.type,
      meta.imdbId,
      meta.id,
      startTime,
    );
  };

  return (
    <button
      onClick={handlePlayClick}
      className="hover:bg-accent focus:bg-accent relative flex w-full flex-col gap-3 rounded-md border border-slate-700 p-3 text-left text-sm transition-colors focus:outline-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">{parsed.addonName}</span>
          {progress && progress.position > 0 && (
            <Badge variant="default" className="flex items-center gap-1">
              <Play className="h-3 w-3" /> Resume
            </Badge>
          )}
          {parsed.releaseGroup && (
            <Badge variant="outline">{parsed.releaseGroup}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {parsed.sourceProvider && (
            <div className="flex items-center gap-1.5" title="Provider">
              <span className="font-medium">{parsed.sourceProvider}</span>
            </div>
          )}
          {parsed.formattedSize && (
            <div className="flex items-center gap-1.5" title="File Size">
              <HardDrive className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{parsed.formattedSize}</span>
            </div>
          )}
          {parsed.sources && (
            <div className="flex items-center gap-1.5" title="File Size">
              <Wifi className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{parsed.sources.length}</span>
            </div>
          )}
          {parsed.seeders !== null && (
            <div className="flex items-center gap-1.5" title="Seeders">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{parsed.seeders}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {parsed.cleanedTitle}
      </p>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {allTags.map((tag) => (
            <DetailBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
      {progressPercent > 0 && progressPercent < 95 && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-700/50">
          <div
            className="bg-primary h-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </button>
  );
}
