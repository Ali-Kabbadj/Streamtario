"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AddonCatalogItem } from "../hooks/useAddonCatalogs";
import { Loader2, Blocks } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AddonDetailsSheetProps {
  addon: AddonCatalogItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isInstalled: boolean;
  isPending: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}

export function AddonDetailsSheet({
  addon,
  isOpen,
  onOpenChange,
  isInstalled,
  isPending,
  onInstall,
  onUninstall,
}: AddonDetailsSheetProps) {
  const [imageError, setImageError] = useState(false);

  if (!addon) return null;

  const { manifest } = addon;

  if (addon && imageError) {
    setImageError(false);
  }

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex-co flex p-2">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
              {manifest.logo && !imageError ? (
                <Image
                  src={manifest.logo}
                  alt={`${manifest.name} logo`}
                  className="h-full w-full object-contain"
                  onError={handleImageError}
                  width={64}
                  height={64}
                />
              ) : (
                <Blocks className="h-8 w-8 text-slate-500" />
              )}
            </div>
            <div>
              <SheetTitle className="text-2xl">{manifest.name}</SheetTitle>
              <SheetDescription>v{manifest.version}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-grow overflow-y-auto p-5 pr-4">
          <p className="text-muted-foreground mt-4 text-base">
            {manifest.description}
          </p>

          <div className="mt-6">
            <h4 className="font-semibold">Capabilities</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {manifest.types.map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          {isInstalled ? (
            <Button
              className="w-full"
              variant="destructive"
              onClick={onUninstall}
              disabled={isPending}
              size="lg"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Uninstalling..." : "Uninstall"}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={onInstall}
              disabled={isPending}
              size="lg"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Installing..." : "Install"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
