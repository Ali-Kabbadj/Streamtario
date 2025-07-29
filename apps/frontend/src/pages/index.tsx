"use client";

import { useProfileContext } from "@/providers/profile-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { useHomeData } from "@/features/home/hooks/useHomeData";
import { AddonSection } from "@/features/home/components/AddonSection";

export type SelectableProfile = Pick<
  Profile,
  "id" | "name" | "avatar" | "isPrivate"
>;

// This is the "Home" page component. It assumes it will only be rendered
// when a user is fully authenticated and has selected a profile.
export default function HomePage() {
  const { selectedProfile } = useProfileContext();
  const { boardData, isLoading } = useHomeData(selectedProfile?.id ?? "");

  const renderSkeletons = () => (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-64 w-48 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    // The MainAppLayout wrapper is GONE. It is handled by _app.tsx.
    <div className="container mx-auto space-y-12">
      <div>
        <h2 className="mb-4 text-3xl font-bold tracking-tight">
          Continue Watching
        </h2>
        <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
          <p className="text-muted-foreground">Functionality coming soon!</p>
        </div>
      </div>

      {isLoading
        ? renderSkeletons()
        : boardData.map((addonData) => (
            <AddonSection key={addonData.addonName} data={addonData} />
          ))}
    </div>
  );
}
