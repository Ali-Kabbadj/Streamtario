import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GraphqlProvider } from "@/providers/graphql-provider";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { APP_CONFIG } from "@/config/env";
import { ThemeProvider } from "@/providers/theme-provider";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  ProfileProvider,
  useProfileContext,
} from "@/providers/profile-provider";
import { ViewProvider, useView } from "@/providers/view-provider";
import { DiscoverProvider } from "@/providers/discover-provider";
import { GlobalLoader } from "@/components/shared/GlobalLoader";
import { AuthFeature } from "@/features/auth";
import { ProfileSelectionFeature } from "@/features/profile-selection";
import { MainAppLayout } from "@/features/layout";
import { HomeView } from "@/views/HomeView";
import { DiscoverView } from "@/views/DiscoverView";
import { AddonsView } from "@/views/AddonsView";
import { SearchView } from "@/views/SearchView";
import { MetaView } from "@/views/MetaView";

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
    default:
      return <HomeView />;
  }
};

const AppContent = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { selectedProfile, selectProfile } = useProfileContext();

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated) {
    return <AuthFeature />;
  }

  if (isAuthenticated && user && !selectedProfile) {
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

export default function App({ Component, pageProps }: AppProps) {
  if (!APP_CONFIG.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    console.error("Google Client ID is not configured.");
    return <div>Error: Google authentication is not configured.</div>;
  }

  return (
    <GoogleOAuthProvider clientId={APP_CONFIG.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <GraphqlProvider>
          <AuthProvider>
            <ProfileProvider>
              <ViewProvider>
                <DiscoverProvider>
                  <div className="relative">
                    <div className="fixed right-6 bottom-6 z-50">
                      <ThemeToggle />
                    </div>
                    <AppContent />
                  </div>
                </DiscoverProvider>
              </ViewProvider>
            </ProfileProvider>
          </AuthProvider>
        </GraphqlProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
