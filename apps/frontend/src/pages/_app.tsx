import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GraphqlProvider } from "@/providers/graphql-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { APP_CONFIG } from "@/config/env";
import { ThemeProvider } from "@/providers/theme-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { ViewProvider } from "@/providers/view-provider";
import { DiscoverProvider } from "@/providers/discover-provider";
import { useEffect } from "react";
import { PlayerProvider, usePlayer } from "@/providers/PlayerProvider";

// This component now wraps the entire app and controls the body class
const AppContainer = ({ children }: { children: React.ReactNode }) => {
  const { status } = usePlayer();

  useEffect(() => {
    if (status === "playing" || status === "preparing" || status === "error") {
      document.body.classList.add("player-active");
    } else {
      document.body.classList.remove("player-active");
    }
  }, [status]);

  return <div id="app-root">{children}</div>;
};

export default function App({ Component, pageProps }: AppProps) {
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
                  <PlayerProvider>
                    <AppContainer>
                      <Component {...pageProps} />
                    </AppContainer>
                  </PlayerProvider>
                </DiscoverProvider>
              </ViewProvider>
            </ProfileProvider>
          </AuthProvider>
        </GraphqlProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
