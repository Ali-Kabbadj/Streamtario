"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddonCatalogs,
  type AddonCatalogItem,
} from "@/features/addons/hooks/useAddonCatalogs";
import { AddonCard } from "@/features/addons/components/AddonCard";
import { useInstallAddon } from "@/features/addons/hooks/useInstallAddon";
import { useUninstallAddon } from "@/features/addons/hooks/useUninstallAddon";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useProfileContext } from "@/providers/profile-provider";

type TabValue = "installed" | "official" | "community";

export function AddonsView() {
  const { selectedProfile } = useProfileContext();
  const [activeTab, setActiveTab] = useState<TabValue>("official");
  const [pendingAddonId, setPendingAddonId] = useState<string | null>(null);

  const profileId = selectedProfile?.id ?? "";

  const { data: profileData, isLoading: isLoadingProfile } =
    useProfile(profileId);
  const { data: officialAddons, isLoading: isLoadingOfficial } =
    useAddonCatalogs("official");
  const { data: communityAddons, isLoading: isLoadingCommunity } =
    useAddonCatalogs("community");

  const onMutationSettled = () => setPendingAddonId(null);

  const { mutate: installAddon } = useInstallAddon(profileId);
  const { mutate: uninstallAddon } = useUninstallAddon(profileId);

  const installedManifestUrls = useMemo(() => {
    return new Set(
      profileData?.profile?.installedAddons.map((a) => a.manifestUrl),
    );
  }, [profileData]);

  const installedAddons = useMemo(() => {
    const allAddons = [...(officialAddons ?? []), ...(communityAddons ?? [])];
    const uniqueAddons = new Map<string, AddonCatalogItem>();
    allAddons.forEach((addon) => {
      if (installedManifestUrls.has(addon.transportUrl)) {
        uniqueAddons.set(addon.transportUrl, addon);
      }
    });
    return Array.from(uniqueAddons.values());
  }, [officialAddons, communityAddons, installedManifestUrls]);

  const handleInstall = (addon: AddonCatalogItem) => {
    setPendingAddonId(addon.manifest.id);
    installAddon(
      { profileId, manifestUrl: addon.transportUrl },
      { onSettled: onMutationSettled },
    );
  };

  const handleUninstall = (addon: AddonCatalogItem) => {
    setPendingAddonId(addon.manifest.id);
    uninstallAddon(
      { profileId, manifestId: addon.manifest.id },
      { onSettled: onMutationSettled },
    );
  };

  const renderAddonGrid = (
    addons: AddonCatalogItem[] | undefined,
    isLoading: boolean,
  ) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[250px] w-full" />
          ))}
        </div>
      );
    }
    if (!addons || addons.length === 0) {
      return (
        <p className="text-muted-foreground">
          No add-ons to display in this category.
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {addons.map((addon) => (
          <AddonCard
            key={`${addon.manifest.id}-${addon.transportUrl}`}
            addon={addon}
            isInstalled={installedManifestUrls.has(addon.transportUrl)}
            onInstall={() => handleInstall(addon)}
            onUninstall={() => handleUninstall(addon)}
            isPending={pendingAddonId === addon.manifest.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Add-on Management</h1>
        <p className="text-muted-foreground">
          Install, uninstall, and manage add-ons for your profile.
        </p>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="official">Official</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
        <TabsContent value="installed" className="mt-6">
          {renderAddonGrid(installedAddons, isLoadingProfile)}
        </TabsContent>
        <TabsContent value="official" className="mt-6">
          {renderAddonGrid(officialAddons, isLoadingOfficial)}
        </TabsContent>
        <TabsContent value="community" className="mt-6">
          {renderAddonGrid(communityAddons, isLoadingCommunity)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
