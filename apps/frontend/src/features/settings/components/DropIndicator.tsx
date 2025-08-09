"use client";

import { useEffect, useState } from "react";

export type DropPosition = "top" | "bottom" | "nest" | null;

interface DropIndicatorProps {
  isOver: boolean;
  position: DropPosition;
  overId: string | null;
}

export const DropIndicator = ({
  isOver,
  position,
  overId,
}: DropIndicatorProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (overId) {
      // Use data-dnd-id to be more specific and avoid conflicts
      const element = document.querySelector(`[data-dnd-id="${overId}"]`);
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    } else {
      setRect(null);
    }
  }, [overId]);

  // FIX: Do not render anything if the position is 'nest', as the item itself will handle it.
  if (!isOver || !position || position === "nest" || !rect) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    width: rect.width,
    height: "2px",
    backgroundColor: "#3b82f6", // blue-500
    borderRadius: "1px",
    pointerEvents: "none",
    zIndex: 1000,
    left: rect.left,
    transform: "translateY(-50%)",
  };

  if (position === "top") {
    style.top = rect.top;
  } else if (position === "bottom") {
    style.top = rect.bottom;
  }
  // The 'nest' case is removed from here.

  return <div style={style} aria-hidden="true" />;
};
