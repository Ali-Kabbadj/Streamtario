// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GraphqlProvider } from "@/providers/graphql-provider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <GraphqlProvider>
      <Component {...pageProps} />
    </GraphqlProvider>
  );
}
