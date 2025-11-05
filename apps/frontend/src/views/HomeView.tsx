"use client";

import { useProfileContext } from "@/providers/profile-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeData } from "@/features/home/hooks/useHomeData";
import { AddonSection } from "@/features/home/components/AddonSection";
import { ContinueWatchingSection } from "@/features/home/components/ContinueWatchingSection";

export function HomeView() {
  const { selectedProfile } = useProfileContext();
  const { data, isLoading, isPending, isSuccess } = useHomeData(
    selectedProfile?.id ?? "",
  );

  const renderSkeletons = () => (
    <div className="space-y-12">
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="w-48 flex-shrink-0">
              <Skeleton className="h-[270px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="w-48 flex-shrink-0">
              <Skeleton className="h-[270px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="w-48 flex-shrink-0">
              <Skeleton className="h-[270px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="w-48 flex-shrink-0">
              <Skeleton className="h-[270px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const hasContent =
    isSuccess &&
    data?.profile?.homeCatalogs &&
    data.profile.homeCatalogs.length > 0;

  return (
    <div className="space-y-8 pr-4">
      <ContinueWatchingSection />
      {(isLoading || isPending) && renderSkeletons()}
      {isSuccess && !hasContent && (
        <div className="flex h-40 w-[60vw] items-center justify-center self-baseline justify-self-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 p-10">
          <p className="text-muted-foreground">
            No content to display. Try installing some addons!
          </p>
        </div>
      )}
      {hasContent &&
        data.profile!.homeCatalogs.map((addonData) => (
          <AddonSection key={addonData.addonName} data={addonData} />
        ))}
    </div>
  );
}
