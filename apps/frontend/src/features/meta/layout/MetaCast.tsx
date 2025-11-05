"use client";

import { useRef, type RefObject } from "react";
import type { CastType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { CastMemberCard } from "../components/CastMemberCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MetaCastProps {
  cast?: (CastType | null)[] | null;
  onPersonClick: (name: string) => void;
}

export function MetaCast({ cast, onPersonClick }: MetaCastProps) {
  const castListRef = useRef<HTMLDivElement | null>(null);

  const scrollHorizontally = (
    ref: RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 px-4 md:px-0">
      <h2 className="mb-4 text-2xl font-bold">Cast</h2>
      <div className="group relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute top-1/2 left-0 z-20 -translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => scrollHorizontally(castListRef, "left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div
          ref={castListRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto"
        >
          {cast.map((member, index) =>
            member?.name ? (
              <CastMemberCard
                key={`${member.name}-${index}`}
                member={member}
                onClick={() => onPersonClick(member.name!)}
              />
            ) : null,
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-1/2 right-0 z-20 translate-x-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => scrollHorizontally(castListRef, "right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
