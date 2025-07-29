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
import { GlobalLoader } from "@/components/shared/GlobalLoader";
import { AuthFeature } from "@/features/auth";
import { ProfileSelectionFeature } from "@/features/profile-selection";
import { MainAppLayout } from "@/features/layout";

// This component is the new "brain" of the application's UI.
// It receives the page component as its child.
const AppContent = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { selectedProfile, selectProfile } = useProfileContext();

  // 1. While we're figuring out the auth state, show a global loader.
  if (isLoading) {
    return <GlobalLoader />;
  }

  // 2. If the user is not authenticated, they can only see the login screen.
  if (!isAuthenticated) {
    return <AuthFeature />;
  }

  // 3. If they are authenticated but haven't selected a profile, show the selection screen.
  // This correctly passes the `onProfileSelect` prop.
  if (isAuthenticated && user && !selectedProfile) {
    return <ProfileSelectionFeature onProfileSelect={selectProfile} />;
  }

  // 4. If they are authenticated AND have selected a profile, show the main app layout.
  // The current page (passed as `children`) is rendered inside this persistent layout.
  if (isAuthenticated && selectedProfile) {
    return <MainAppLayout>{children}</MainAppLayout>;
  }

  // Fallback case, should not normally be reached.
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
              <div className="relative">
                <div className="fixed right-6 bottom-6 z-50">
                  <ThemeToggle />
                </div>
                {/* 
                  The AppContent component wraps the actual page component.
                  This ensures the logic runs for every page change.
                */}
                <AppContent>
                  <Component {...pageProps} />
                </AppContent>
              </div>
            </ProfileProvider>
          </AuthProvider>
        </GraphqlProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
