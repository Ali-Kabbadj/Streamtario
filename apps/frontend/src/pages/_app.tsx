import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GraphqlProvider } from "@/providers/graphql-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ProfileProvider } from "@/providers/profile-provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <GraphqlProvider>
      <AuthProvider>
        <ProfileProvider>
          <Component {...pageProps} />
        </ProfileProvider>
      </AuthProvider>
    </GraphqlProvider>
  );
}
