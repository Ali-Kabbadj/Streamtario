"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type Runtime = "browser" | "webview2";

interface RuntimeContextType {
  isWebView: boolean;
  runtime: Runtime;
}

const RuntimeContext = createContext<RuntimeContextType | undefined>(undefined);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const isWebView = typeof window !== "undefined" && !!window.chrome?.webview;
    return {
      isWebView,
      runtime: isWebView ? ("webview2" as Runtime) : ("browser" as Runtime),
    };
  }, []);

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (context === undefined) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return context;
}
