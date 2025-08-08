"use client";

import { useAuth } from "@/providers/auth-provider";
import { useProfileContext } from "@/providers/profile-provider";
import { useView } from "@/providers/view-provider";
import { GlobalLoader } from "@/components/shared/GlobalLoader";
import { AuthFeature } from "@/features/auth";
import { ProfileSelectionFeature } from "@/features/profile-selection";
import { MainAppLayout } from "@/features/layout";
import { HomeView } from "@/views/HomeView";
import { DiscoverView } from "@/views/DiscoverView";
import { AddonsView } from "@/views/AddonsView";
import { SearchView } from "@/views/SearchView";
import { MetaView } from "@/views/MetaView";
import { SettingsView } from "@/views/SettingsView";

const RenderActiveView = () => {
  const { currentView } = useView();

  switch (currentView.name) {
    case "home":
      return <HomeView />;
    case "discover":
      return <DiscoverView />;
    case "addons":
      return <AddonsView />;
    case "search":
      return <SearchView query={currentView.query} />;
    case "meta":
      return (
        <MetaView itemId={currentView.itemId} itemType={currentView.itemType} />
      );
    case "settings":
      return <SettingsView />;
    default:
      return <HomeView />;
  }
};

export const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedProfile, selectProfile } = useProfileContext();

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated) {
    return <AuthFeature />;
  }

  if (isAuthenticated && !selectedProfile) {
    return <ProfileSelectionFeature onProfileSelect={selectProfile} />;
  }

  if (isAuthenticated && selectedProfile) {
    return (
      <MainAppLayout>
        <RenderActiveView />
      </MainAppLayout>
    );
  }

  return <GlobalLoader />;
};
