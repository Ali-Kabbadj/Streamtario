import fs from "fs";
import path from "path";
import bencode from "bencode";
import crypto from "crypto";
import { config } from "../config.js";
import { ParsedTorrentInfo } from "../types/types.js";
import { buildLogger } from "../utils/logger.js";

const logger = buildLogger(import.meta.url);

export class TorrentFileService {
  private static instance: TorrentFileService;

  private constructor() {
    logger.init("TorrentFileService initialized", { context: "TorrentFileService Constructor" });
  }

  public static getInstance(): TorrentFileService {
    if (!TorrentFileService.instance) {
      TorrentFileService.instance = new TorrentFileService();
    }
    return TorrentFileService.instance;
  }

  public async findTorrentFile(
    torrentId: string,
  ): Promise<{ fullPath: string; torrentDir: string }> {
    const torrentDir = path.join(config.TORRENTS_BASE_DIR, torrentId);
    if (!fs.existsSync(torrentDir)) {
      throw new Error(`Directory not found for torrent ID ${torrentId}`);
    }
    const torrentFileName = fs
      .readdirSync(torrentDir)
      .find((f) => f.endsWith(".torrent"));
    if (!torrentFileName) {
      throw new Error(`No .torrent file found in directory ${torrentDir}`);
    }
    return { fullPath: path.join(torrentDir, torrentFileName), torrentDir };
  }

  public async parseTorrentFile(
    filePath: string,
    torrentDir: string,
  ): Promise<ParsedTorrentInfo> {
    const buffer = fs.readFileSync(filePath);
    const decodedForMeta = bencode.decode(buffer, "utf8");
    const name =
      decodedForMeta?.info?.["name.utf-8"] ||
      decodedForMeta?.info?.name ||
      "Unknown Torrent";

    const decodedForHash = bencode.decode(buffer);
    if (!decodedForHash?.info) {
      throw new Error("Invalid torrent file: missing 'info' dictionary.");
    }
    const infoBuffer = bencode.encode(decodedForHash.info);
    const infoHash = crypto.createHash("sha1").update(infoBuffer).digest("hex");

    let announce: string[] = [];
    if (decodedForMeta.announce) {
      const announceList = Array.isArray(decodedForMeta["announce-list"])
        ? decodedForMeta["announce-list"]
        : [decodedForMeta.announce];
      announce = [...new Set(announceList.flat(Infinity))] as string[];
    }

    return { infoHash, name, announce, buffer, torrentDir };
  }
}
