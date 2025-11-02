// src/features/player/hooks/useHybridPlayer.ts

import { useRuntime } from "@/providers/RuntimeProvider";
import { useMpvPlayer } from "./useMpvPlayer";
import { useBrowserPlayerAdapter } from "./useBrowserPlayerAdapter";
import { useRef } from "react";
import type { MediaPlayerInstance } from "@vidstack/react";

export function useHybridPlayer() {
    const { isWebView } = useRuntime();
    const mpv = useMpvPlayer();
    const browser = useBrowserPlayerAdapter();
    const emptyRef = useRef<MediaPlayerInstance | null>(null);

    if (isWebView) {
        return { isWebView: true as const, ...mpv, ref: emptyRef };
    }

    return { isWebView: false as const, ...browser };
}