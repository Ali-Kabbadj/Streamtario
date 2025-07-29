"use client";

import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";

interface SearchResultCardProps {
  item: {
    id: string;
    name: string;
    type: string;
    poster?: string | null;
  };
}

export function SearchResultCard({ item }: SearchResultCardProps) {
  return (
    <motion.div
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <AspectRatio ratio={2 / 3}>
        <Image
          src={item.poster ?? "/placeholder-poster.png"}
          alt={item.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
          fill
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      </AspectRatio>
      <div className="absolute bottom-0 p-4">
        <h3 className="text-lg font-bold text-white">{item.name}</h3>
        <p className="text-sm text-slate-400 uppercase">{item.type}</p>
      </div>
    </motion.div>
  );
}
