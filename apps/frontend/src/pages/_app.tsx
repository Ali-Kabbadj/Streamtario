import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { GraphqlProvider } from "@/providers/graphql-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { APP_CONFIG } from "@/config/env";
import { ThemeProvider } from "@/providers/theme-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { ViewProvider } from "@/providers/view-provider";
import { DiscoverProvider } from "@/providers/discover-provider";
import { PlayerProvider } from "@/providers/PlayerProvider";
import { Toaster } from "@/components/ui/sonner";
import { RuntimeProvider } from "@/providers/RuntimeProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Streamtario</title>
      </Head>

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
                    <RuntimeProvider>
                      <PlayerProvider>
                        <div id="app-root">
                          <Component {...pageProps} />
                          <Toaster />
                        </div>
                      </PlayerProvider>
                    </RuntimeProvider>
                  </DiscoverProvider>
                </ViewProvider>
              </ProfileProvider>
            </AuthProvider>
          </GraphqlProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </>
  );
}
