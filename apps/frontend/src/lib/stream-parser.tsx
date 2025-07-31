import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = GetStreamsQuery["profile"]["streams"][0];

export interface ParsedStreamDetails {
  filename: string;
  addonName: string;
  seeders: number | null;
  size: number | null;
  formattedSize: string | null;
  tags: string[];
}

const QUALITY_ORDER: Record<string, number> = {
  "4K": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  SD: 1,
};

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function parseInfoString(str: string): {
  tags: string[];
  seeders: number | null;
  size: string | null;
} {
  const tags = new Set<string>();
  let seeders: number | null = null;
  let size: string | null = null;

  const qualityMatch = str.match(/\b(4k|2160p|1080p|720p|480p|sd)\b/i);
  if (qualityMatch)
    tags.add(qualityMatch[0].replace("p", "P").replace("k", "K"));

  const hdrMatch = str.match(/\b(hdr|dv|dolby vision)\b/i);
  if (hdrMatch) tags.add("HDR");

  const codecMatch = str.match(/\b(x265|h265|hevc|av1)\b/i);
  if (codecMatch) tags.add(codecMatch[0].toUpperCase());

  const bitMatch = str.match(/\b(10.?bit)\b/i);
  if (bitMatch) tags.add("10-bit");

  const audioChannelMatch = str.match(/\b(5.1|7.1)\b/i);
  if (audioChannelMatch) tags.add(audioChannelMatch[0]);

  const audioCodecMatch = str.match(
    /\b(dts|atmos|dolby digital plus|ddp5|ac3)\b/i,
  );
  if (audioCodecMatch) {
    const codec = audioCodecMatch[0].toLowerCase();
    if (codec.includes("dolby digital") || codec.includes("ddp5"))
      tags.add("DD+");
    else if (codec === "ac3" || codec.includes("atmos"))
      tags.add("Dolby Atmos");
    else tags.add(codec.toUpperCase());
  }

  const seederMatch = str.match(/👤\s*(\d+)/) ?? str.match(/seeders: (\d+)/i);
  if (seederMatch) seeders = parseInt(seederMatch[1], 10);

  const sizeMatch =
    str.match(/💾\s*([\d.]+\s*\w+)/) ?? str.match(/size: ([\d.]+\s*\w+)/i);
  if (sizeMatch) size = sizeMatch[1];

  return { tags: Array.from(tags), seeders, size };
}

export function parseStream(stream: Stream): ParsedStreamDetails {
  const behavior = stream.behaviorHints;
  const name = stream.name ?? "";
  const title = stream.title ?? "";
  const description = (behavior?.description as string) ?? "";

  const behaviorFilename = behavior?.filename as string | undefined;
  const filename =
    behaviorFilename ||
    title.split("\n")[0] ||
    description.split("\n")[0] ||
    "Untitled";

  const fullInfoString = `${name}\n${title}\n${description}\n${filename}`;

  const parsedInfo = parseInfoString(fullInfoString);

  const videoSizeBytes = behavior?.videoSize as number | undefined;
  const formattedSize = videoSizeBytes
    ? formatBytes(videoSizeBytes)
    : parsedInfo.size;

  return {
    filename,
    addonName: stream.addonName ?? "Unknown Addon",
    seeders: parsedInfo.seeders,
    size: videoSizeBytes,
    formattedSize: formattedSize,
    tags: parsedInfo.tags,
  };
}
