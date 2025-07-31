"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStreams } from "../hooks/useStreams";
import { useProfileContext } from "@/providers/profile-provider";
import { StreamList } from "./StreamList";

interface StreamSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  content: {
    itemType: string;
    itemId: string;
    title: string;
  } | null;
}

export function StreamSheet({
  isOpen,
  onOpenChange,
  content,
}: StreamSheetProps) {
  const { selectedProfile } = useProfileContext();

  const { data: streams, isLoading: isLoadingStreams } = useStreams({
    profileId: selectedProfile?.id ?? "",
    itemType: content?.itemType ?? "",
    itemId: content?.itemId ?? "",
    enabled: isOpen && !!content,
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card flex w-full flex-col border-slate-700 text-white sm:max-w-lg">
        {content && (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl">{content.title}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-grow pr-4">
              <div className="py-4">
                <StreamList streams={streams} isLoading={isLoadingStreams} />
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
