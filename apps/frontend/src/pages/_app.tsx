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
import { WebViewAuthHandler } from "@/features/auth/components/webview-auth-handler";
import { useEffect } from "react";
export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const handleUncaughtError = (event: ErrorEvent) => {
      console.error("[Global Error Handler] Uncaught error:", event.error);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error(
        "[Global Error Handler] Unhandled promise rejection:",
        event.reason,
      );
    };

    window.addEventListener("error", handleUncaughtError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleUncaughtError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

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
              <WebViewAuthHandler />
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
