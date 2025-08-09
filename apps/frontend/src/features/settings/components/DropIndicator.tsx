// components/DropIndicator.tsx
"use client";

import { useEffect, useState } from "react";
export type DropPosition = "top" | "bottom" | "nest" | null;

interface DropIndicatorProps {
  isOver: boolean;
  position: DropPosition;
  overId: string | null;
  color?: string;
}

export const DropIndicator = ({
  isOver,
  position,
  overId,
  color,
}: DropIndicatorProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!overId) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-dnd-id="${overId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());

    const onResize = () => {
      const e2 = document.querySelector(`[data-dnd-id="${overId}"]`);
      if (e2) setRect(e2.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [overId]);

  if (!isOver || !position || !rect) return null;

  const accent = color ?? "#3b82f6";

  if (position === "top" || position === "bottom") {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: rect.left,
          width: rect.width,
          pointerEvents: "none",
          zIndex: 2000,
          height: 3,
          borderRadius: 2,
          top: position === "top" ? rect.top - 1.5 : rect.bottom - 1.5,
          "--accent-color": accent,
          "--accent-color-alpha-22": `${accent}22`,
        } as React.CSSProperties}
        className="drop-indicator-bar"
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: rect.left,
        width: rect.width,
        pointerEvents: "none",
        zIndex: 2000,
        top: rect.top,
        height: rect.height,
        borderRadius: 8,
        "--accent-color": accent,
        "--accent-color-alpha-11": `${accent}11`,
      } as React.CSSProperties}
      className="drop-indicator-nest"
    />
  );
};
