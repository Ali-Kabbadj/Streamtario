// hooks/usePointerPosition.ts
"use client";

import { useEffect, useRef } from "react";

/**
 * Simple hook that keeps the last known pointer coordinates (clientX/clientY)
 * in a ref. This is used when certain DnD events do not carry precise coords.
 */
export const usePointerPosition = () => {
    const last = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const onPointer = (ev: PointerEvent) => {
        last.current = { x: ev.clientX, y: ev.clientY };
      };
      const onMouseMove = (ev: MouseEvent) => {
        last.current = { x: ev.clientX, y: ev.clientY };
      };
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      return () => {
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("mousemove", onMouseMove);
      };
    }, []);

    return last;
};
