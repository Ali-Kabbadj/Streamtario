"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AddonCatalogItem } from "../hooks/useAddonCatalogs";
import { Blocks } from "lucide-react";
import Image from "next/image";

interface AddonCardProps {
  addon: AddonCatalogItem;
  isInstalled: boolean;
  onViewDetails: () => void;
}

export function AddonCard({
  addon,
  isInstalled,
  onViewDetails,
}: AddonCardProps) {
  const { manifest } = addon;
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Card
      onClick={onViewDetails}
      className="relative flex h-full cursor-pointer flex-col bg-slate-900/50 transition-colors hover:bg-slate-800/80"
    >
      {isInstalled && (
        <Badge className="absolute top-4 right-4" variant="default">
          Installed
        </Badge>
      )}
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
          {manifest.logo && !imageError ? (
            <Image
              src={manifest.logo}
              alt={`${manifest.name} logo`}
              className="h-full w-full object-contain"
              onError={handleImageError}
              width={48}
              height={48}
            />
          ) : (
            <Blocks className="h-6 w-6 text-slate-500" />
          )}
        </div>
        <div>
          <CardTitle>{manifest.name}</CardTitle>
          <CardDescription>v{manifest.version}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <p className="text-muted-foreground mb-4 line-clamp-3 flex-grow text-sm">
          {manifest.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {manifest.types.map((type) => (
            <Badge key={type} variant="secondary">
              {type}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
