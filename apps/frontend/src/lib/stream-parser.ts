import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Stream = GetStreamsQuery["profile"]["streams"][0];

export interface ParsedStreamDetails {
  filename: string;
  cleanedTitle: string;
  addonName: string;
  releaseGroup: string | null;
  seeders: number | null;
  sizeInBytes: number | null;
  formattedSize: string | null;
  sourceProvider: string | null;
  tags: {
    quality: string | null;
    source: string | null;
    video: string[];
    audio: string[];
    languages: string[];
    other: string[];
  };
  originalIndex: number;
}

const TAG_LIBRARY = {
  quality: {
    "4K": [/\b(2160p|4k|uhd)\b/i],
    "2K": [/\b(1440p|2k)\b/i],
    "1080p": [/\b(1080p)\b/i],
    "720p": [/\b(720p)\b/i],
    SD: [/\b(480p|576p|sd)\b/i],
  },
  source: {
    Remux: [/\b(remux)\b/i],
    BluRay: [/\b(bluray|bdrip|brrip)\b/i],
    "WEB-DL": [/\b(web-?dl|web)\b/i],
    WEBRip: [/\b(webrip)\b/i],
    HDTV: [/\b(hdtv)\b/i],
    DVD: [/\b(dvdrip|dvd)\b/i],
    CAM: [/\b(cam|hdcam)\b/i],
    TS: [/\b(ts|telesync|hdtc)\b/i],
  },
  video: {
    "Dolby Vision": [/\b(dolby vision|dv)\b/i],
    "HDR10+": [/\b(hdr10\+)\b/i],
    HDR: [/\b(hdr)\b/i],
    AV1: [/\b(av1)\b/i],
    "H.265": [/\b(h265|hevc|x265)\b/i],
    "H.264": [/\b(h264|avc|x264)\b/i],
    XviD: [/\b(xvid)\b/i],
    "10bit": [/\b(10-?bit|hi10p)\b/i],
    "8bit": [/\b(8-?bit)\b/i],
  },
  audio: {
    "Dolby Atmos": [/\b(atmos)\b/i],
    "Dolby TrueHD": [/\b(truehd)\b/i],
    "DTS-HD MA": [/\b(dts-?hd|dts-?ma)\b/i],
    "DD+": [/\b(dd\+|eac3|ddp)\b/i],
    AC3: [/\b(ac3)\b/i],
    DTS: [/\b(dts)\b/i],
    AAC: [/\b(aac)\b/i],
    FLAC: [/\b(flac)\b/i],
    Opus: [/\b(opus)\b/i],
    "7.1": [/\b(7.1)\b/i],
    "5.1": [/\b(5.1)\b/i],
    "2.0": [/\b(2.0|stereo)\b/i],
  },
  languages: {
    Multi: [/\b(multi)\b/i],
    "Dual Audio": [/\b(dual)\b/i],
    Dubbed: [/\b(dubbed)\b/i],
    English: [/\b(eng)\b/i],
    Italian: [/\b(ita)\b/i],
    Spanish: [/\b(spa|esp)\b/i],
    French: [/\b(fra|fre)\b/i],
    German: [/\b(ger|deu)\b/i],
    Russian: [/\b(rus)\b/i],
    Japanese: [/\b(jpn)\b/i],
  },
  other: {
    REPACK: [/\b(repack)\b/i],
    PROPER: [/\b(proper)\b/i],
    EXTENDED: [/\b(extended)\b/i],
    REMASTERED: [/\b(remastered)\b/i],
  },
};

const unique = <T,>(arr: T[]): T[] => [...new Set(arr)];

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function parseStream(
  stream: Stream,
  originalIndex: number,
): ParsedStreamDetails {
  const behavior = stream.behaviorHints ?? {};
  const name = stream.name ?? "";
  const title = stream.title ?? "";
  const filename =
    (behavior.filename as string) ||
    title.split("\n")[0] ||
    name.split("\n")[0] ||
    "Untitled";

  let searchableString = [
    name,
    title,
    filename,
    (behavior.bingeGroup as string) || "",
  ]
    .join(" ")
    .toLowerCase();

  const releaseGroupMatch = filename.match(/-(\w+)$/i);
  const releaseGroup = releaseGroupMatch
    ? releaseGroupMatch[1].toUpperCase()
    : null;
  if (releaseGroup) {
    searchableString = searchableString.replace(releaseGroup.toLowerCase(), "");
  }

  const result: ParsedStreamDetails = {
    filename,
    cleanedTitle: filename,
    addonName: stream.addonName ?? "Unknown Addon",
    releaseGroup,
    seeders: null,
    sizeInBytes:
      typeof behavior.videoSize === "number" ? behavior.videoSize : null,
    formattedSize: null,
    sourceProvider: null,
    tags: {
      quality: null,
      source: null,
      video: [],
      audio: [],
      languages: [],
      other: [],
    },
    originalIndex,
  };

  const seederMatch = title.match(/(?:👤|S:)\s*(\d+)/i);
  if (seederMatch) result.seeders = parseInt(seederMatch[1], 10);

  const sizeMatch = title.match(/💾\s*([\d.]+\s*\w+)/i);
  if (sizeMatch) result.formattedSize = sizeMatch[1];
  else if (result.sizeInBytes)
    result.formattedSize = formatBytes(result.sizeInBytes);

  const providerMatch = title.match(/⚙️\s*(\w+)/i);
  if (providerMatch) result.sourceProvider = providerMatch[1];

  for (const [category, tags] of Object.entries(TAG_LIBRARY)) {
    for (const [canonicalTag, patterns] of Object.entries(tags)) {
      for (const pattern of patterns) {
        if (pattern.test(searchableString)) {
          if (category === "quality") result.tags.quality = canonicalTag;
          else if (category === "source") result.tags.source = canonicalTag;
          else
            result.tags[
              category as "video" | "audio" | "languages" | "other"
            ].push(canonicalTag);

          searchableString = searchableString.replace(pattern, "");
          break;
        }
      }
    }
  }

  result.cleanedTitle = filename
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/[-._]/g, " ") // replace separators with space
    .replace(
      /\b(2160p|1080p|720p|480p|uhd|4k|sd|bluray|web-?dl|webrip|remux|hdr|dv|atmos|dts|ac3|eac3|h264|h265|hevc|avc|x264|x265|dual|multi|dubbed|ita|eng|\[.*?\])\b/gi,
      "",
    )
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();

  // Ensure tags are unique
  for (const key of ["video", "audio", "languages", "other"]) {
    result.tags[key as "video"] = unique(result.tags[key as "video"]);
  }

  return result;
}