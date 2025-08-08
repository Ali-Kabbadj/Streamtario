"use client";

import { cn } from "@/lib/utils";

interface DropIndicatorProps {
  isOver: boolean;
  isContainer: boolean;
}

export const DropIndicator = ({ isOver, isContainer }: DropIndicatorProps) => {
  if (!isOver) return null;

  return (
    <div
      className={cn(
        "absolute inset-x-0 h-1 rounded-full bg-blue-500",
        isContainer ? "top-full -mt-1" : "top-0",
      )}
      aria-hidden="true"
    />
  );
};
