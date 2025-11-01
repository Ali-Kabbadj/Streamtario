// apps/frontend/src/features/player/hooks/useHybridPlayer.ts

import { useRuntime } from "@/providers/RuntimeProvider";
import { useBrowserPlayer } from "./useBrowserPlayer";
import { useMpvPlayer } from "./useMpvPlayer";
import type { PlayerHook } from "../types";

/**
 * A hybrid hook that adheres to the Rules of Hooks by calling both underlying
 * player hooks unconditionally. It then returns the active player's state and
 * actions based on the runtime environment (WebView2 or Browser).
 */
export function useHybridPlayer(): PlayerHook {
    const { isWebView } = useRuntime();

    // Call both hooks on every render to preserve order.
    const mpvPlayer = useMpvPlayer();
    const browserPlayer = useBrowserPlayer();

    // Return the one that matches the current environment.
    return isWebView ? mpvPlayer : browserPlayer;
}