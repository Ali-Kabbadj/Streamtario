"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useView } from "@/providers/view-provider";
import ImageWithFallback from "@/components/shared/ImageWithFallback";

interface CatalogItemCardProps {
  item: {
    id: string;
    name: string;
    type: string;
    poster?: string | null;
  };
}

export const CatalogItemCard = forwardRef<HTMLDivElement, CatalogItemCardProps>(
  ({ item }, ref) => {
    const { navigateTo } = useView();

    const handleClick = () => {
      navigateTo({ name: "meta", itemType: item.type, itemId: item.id });
    };

    return (
      <motion.div
        ref={ref}
        onClick={handleClick}
        className="group relative cursor-pointer overflow-hidden rounded-lg"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        layout
      >
        <AspectRatio ratio={2 / 3}>
          <ImageWithFallback
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
            fallbackSrc={"/images/NoImagePortrait.png"}
            alt={item.name}
            src={item.poster ?? ""}
            width={200}
            height={300}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </AspectRatio>
      </motion.div>
    );
  },
);

CatalogItemCard.displayName = "CatalogItemCard";
