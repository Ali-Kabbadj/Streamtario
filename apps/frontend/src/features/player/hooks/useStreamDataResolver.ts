import { useState, useEffect } from "react";
import type { Stream, FileStats } from "@/features/meta/types";
import { fetchClient } from "@/api/api-client";

export interface ResolvedStreamData {
    contentId: string;
    itemType: string;
    filename: string;
    videoSize: number;
    videoHash: string;
    fileIndex: number;
}

export const useStreamDataResolver = (
    activeStream: {
        stream: Stream;
        infoHash: string | null | undefined;
        fileIndex: number | null | undefined;
        contentId: string;
        itemType: string;
    } | null,
): ResolvedStreamData | null => {
    const [resolvedData, setResolvedData] = useState<ResolvedStreamData | null>(
        null,
    );

    useEffect(() => {
        const resolve = async () => {
            if (!activeStream?.infoHash || typeof activeStream.fileIndex !== 'number') {
                return;
            }

            const { stream, infoHash, fileIndex, contentId, itemType } = activeStream;

            const hints = stream.behaviorHints;
            let videoHash = stream.videoHash ?? hints?.videoHash;
            let videoSize = hints?.videoSize;
            let filename = hints?.filename;

            if (!videoHash || !videoSize || !filename) {
                try {
                    const stats = await fetchClient<FileStats>(
                        `/api/v1/stream/file-stats/${infoHash}/${fileIndex}`,
                    );
                    if (!videoHash && stats.hash) {
                        videoHash = stats.hash;
                    }
                    videoSize ??= stats.size;
                    filename ??= stream.title ?? "video.mp4";
                } catch (error) {
                    console.error("Failed to fetch file stats:", error);
                    return;
                }
            }

            if (videoHash && videoSize && filename) {
                setResolvedData({
                    contentId,
                    itemType,
                    filename,
                    videoSize,
                    videoHash,
                    fileIndex,
                });
            }
        };

        if (activeStream) {
            void resolve();
        } else {
            setResolvedData(null);
        }
    }, [activeStream]);

    useEffect(() => {
        setResolvedData(null);
    }, [activeStream?.stream.infoHash, activeStream?.stream.fileIdx]);


    return resolvedData;
};