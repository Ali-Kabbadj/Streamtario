import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GraphqlProvider } from "@/providers/graphql-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { APP_CONFIG } from "@/config/env";
import { ThemeProvider } from "@/providers/theme-provider";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

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
            <div className="relative">
              <div className="fixed right-6 bottom-6 z-50">
                <ThemeToggle />
              </div>
              <Component {...pageProps} />
            </div>
          </AuthProvider>
        </GraphqlProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
