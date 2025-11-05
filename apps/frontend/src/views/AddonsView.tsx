"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import {
  useAddonCatalogs,
  type AddonCatalogItem,
} from "@/features/addons/hooks/useAddonCatalogs";
import { useManifestsByUrls } from "@/features/addons/hooks/useManifestsByUrls";
import { AddonCard } from "@/features/addons/components/AddonCard";
import { InstallFromUrl } from "@/features/addons/components/InstallFromUrl";
import { AddonDetailsSheet } from "@/features/addons/components/AddonDetailsSheet";
import { useInstallAddon } from "@/features/addons/hooks/useInstallAddon";
import { useUninstallAddon } from "@/features/addons/hooks/useUninstallAddon";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useProfileContext } from "@/providers/profile-provider";

type TabValue = "installed" | "official" | "community";

export function AddonsView() {
  const { selectedProfile } = useProfileContext();
  const [activeTab, setActiveTab] = useState<TabValue>("installed");
  const [pendingAddonId, setPendingAddonId] = useState<string | null>(null);
  const [isInstallSheetOpen, setInstallSheetOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AddonCatalogItem | null>(
    null,
  );

  const profileId = selectedProfile?.id ?? "";

  const { data: profileData } = useProfile(profileId);
  const { data: officialAddons, isLoading: isLoadingOfficial } =
    useAddonCatalogs("official");
  const { data: communityAddons, isLoading: isLoadingCommunity } =
    useAddonCatalogs("community");

  const installedUrls = useMemo(
    () => profileData?.profile?.installedAddons.map((a) => a.manifestUrl) ?? [],
    [profileData],
  );

  const { manifests: installedAddons, isLoading: isLoadingInstalled } =
    useManifestsByUrls(installedUrls);

  const onMutationSuccess = () => {
    setPendingAddonId(null);
    setSelectedAddon(null);
  };

  const { mutate: installAddon } = useInstallAddon(profileId);
  const { mutate: uninstallAddon } = useUninstallAddon(profileId);

  const handleInstall = (addon: AddonCatalogItem) => {
    setPendingAddonId(addon.manifest.id);
    installAddon(
      { profileId, manifestUrl: addon.transportUrl },
      { onSettled: onMutationSuccess },
    );
  };

  const handleUninstall = (addon: AddonCatalogItem) => {
    setPendingAddonId(addon.manifest.id);
    uninstallAddon(
      { profileId, manifestId: addon.manifest.id },
      { onSettled: onMutationSuccess },
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
            isInstalled={installedUrls.includes(addon.transportUrl)}
            onViewDetails={() => setSelectedAddon(addon)}
          />
        ))}
      </div>
    );
  };

  const isSelectedAddonInstalled = useMemo(() => {
    if (!selectedAddon) return false;
    return installedUrls.includes(selectedAddon.transportUrl);
  }, [selectedAddon, installedUrls]);

  return (
    <div className="space-y-8 py-5">
      <div className="pr-4 pb-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className="w-full"
        >
          <div className="flex items-center justify-start">
            <TabsList>
              <TabsTrigger value="installed">Installed</TabsTrigger>
              <TabsTrigger value="official">Official</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>

            <div className="pl-2">
              <Button onClick={() => setInstallSheetOpen(true)}>
                <Link className="mr-2 h-3 w-4" />
                Install from URL
              </Button>
            </div>
          </div>

          <TabsContent value="installed" className="mt-6">
            {renderAddonGrid(installedAddons, isLoadingInstalled)}
          </TabsContent>
          <TabsContent value="official" className="mt-6">
            {renderAddonGrid(officialAddons, isLoadingOfficial)}
          </TabsContent>
          <TabsContent value="community" className="mt-6">
            {renderAddonGrid(communityAddons, isLoadingCommunity)}
          </TabsContent>
        </Tabs>
      </div>

      <InstallFromUrl
        isOpen={isInstallSheetOpen}
        onOpenChange={setInstallSheetOpen}
      />
      <AddonDetailsSheet
        isOpen={!!selectedAddon}
        onOpenChange={(isOpen) => !isOpen && setSelectedAddon(null)}
        addon={selectedAddon}
        isInstalled={isSelectedAddonInstalled}
        isPending={
          !!selectedAddon && pendingAddonId === selectedAddon.manifest.id
        }
        onInstall={() => selectedAddon && handleInstall(selectedAddon)}
        onUninstall={() => selectedAddon && handleUninstall(selectedAddon)}
      />
    </div>
  );
}
