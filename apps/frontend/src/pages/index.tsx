import { AppContent } from "@/components/shared/AppContent";
import Script from "next/script";

export default function IndexPage() {
  return (
    <>
      {process.env.NODE_ENV === "development" && (
        <Script src="http://localhost:8097" strategy="beforeInteractive" />
      )}
      <AppContent />;
    </>
  );
}
