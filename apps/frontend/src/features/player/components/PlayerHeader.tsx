"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface PlayerHeaderProps {
  title: string;
  onBack: () => void;
}

export function PlayerHeader({ title, onBack }: PlayerHeaderProps) {
  return (
    <div className="absolute top-0 right-0 left-0 flex items-center gap-4 bg-gradient-to-b from-black/70 to-transparent p-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <h2 className="truncate text-xl font-bold">{title}</h2>
    </div>
  );
}
