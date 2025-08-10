"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Baby, MapPin, HeartPulse } from "lucide-react"; // <-- Import new icons
import type { PersonDetails } from "../types";

interface PersonDetailsModalProps {
  person: PersonDetails | null;
  isLoading: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const LoadingSkeleton = () => (
  <div className="space-y-4 p-6 pt-0">
    <div className="flex flex-col gap-6 md:flex-row">
      <Skeleton className="h-48 w-36 flex-shrink-0 rounded-lg" />
      <div className="w-full space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

const DetailItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-slate-400" />
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    </div>
  );
};

export function PersonDetailsModal({
  person,
  isLoading,
  isOpen,
  onOpenChange,
}: PersonDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background min-w-[90vw]">
        <ScrollArea className="max-h-[85vh]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            person && (
              <>
                <DialogHeader className="p-6">
                  <div className="flex flex-col gap-6 text-left md:flex-row">
                    <div className="relative h-48 w-36 flex-shrink-0 self-center md:self-start">
                      <ImageWithFallback
                        src={person.imageUrl}
                        fallbackSrc="/images/NoImagePortrait.png"
                        alt={person.name}
                        fill
                        className="rounded-lg object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <DialogTitle className="mb-2 text-3xl font-bold">
                        {person.name}
                      </DialogTitle>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {person.professions.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-8 px-6 pb-6">
                  {/* --- NEW: Biographical Details Section --- */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailItem
                      icon={Baby}
                      label="Born"
                      value={person.birthDate}
                    />
                    <DetailItem
                      icon={MapPin}
                      label="Birthplace"
                      value={person.birthPlace}
                    />
                    {person.deathDate && (
                      <DetailItem
                        icon={HeartPulse}
                        label="Died"
                        value={person.deathDate}
                      />
                    )}
                    {person.deathLocation && (
                      <DetailItem
                        icon={MapPin}
                        label="Place of Death"
                        value={person.deathLocation}
                      />
                    )}
                  </div>

                  {person.biography && (
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">Biography</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {person.biography}
                      </p>
                    </div>
                  )}

                  {person.filmography.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">Known For</h3>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-2">
                        {person.filmography.slice(0, 10).map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between border-b border-slate-800 py-2"
                          >
                            <span className="font-medium">{item.title}</span>
                            <span className="text-muted-foreground">
                              {item.year}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {person.externalLinks.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xl font-semibold">Links</h3>
                      <div className="flex flex-wrap gap-3">
                        {person.externalLinks
                          .filter((link) => link.url)
                          .map((link) => (
                            <a
                              href={link.url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              key={link.site}
                              className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-700"
                            >
                              <ExternalLink className="h-4 w-4" /> {link.site}
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
