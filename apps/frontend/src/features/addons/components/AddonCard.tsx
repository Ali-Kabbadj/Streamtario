"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AddonCatalogItem } from "../hooks/useAddonCatalogs";
import { Loader2, Blocks } from "lucide-react";
import Image from "next/image";

interface AddonCardProps {
  addon: AddonCatalogItem;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  // --- FIX: We now use a single `isPending` prop ---
  isPending: boolean;
}

export function AddonCard({
  addon,
  isInstalled,
  onInstall,
  onUninstall,
  isPending,
}: AddonCardProps) {
  const { manifest } = addon;
  // --- FIX: State to handle image loading errors ---
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Card className="flex h-full flex-col bg-slate-900/50">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        {/* --- FIX: Image fallback logic --- */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
          {manifest.logo && !imageError ? (
            <Image
              src={manifest.logo}
              alt={`${manifest.name} logo`}
              className="h-full w-full object-contain"
              onError={handleImageError}
              width={10}
              height={10}
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
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm">{manifest.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {manifest.types.map((type) => (
            <Badge key={type} variant="secondary">
              {type}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {isInstalled ? (
          <Button
            className="w-full"
            variant="destructive"
            onClick={onUninstall}
            // --- FIX: Button state is now driven by the specific `isPending` prop ---
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Uninstalling..." : "Uninstall"}
          </Button>
        ) : (
          <Button className="w-full" onClick={onInstall} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Installing..." : "Install"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
