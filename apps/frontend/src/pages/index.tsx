import { AppContent } from "@/components/shared/AppContent";
import Script from "next/script";

export default function IndexPage() {
  return (
    <>
      {process.env.NODE_ENV === "development" && (
        // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
        <Script src="http://localhost:8097" strategy="beforeInteractive" />
      )}
      <AppContent />
    </>
  );
}
