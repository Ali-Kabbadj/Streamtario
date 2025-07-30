"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "addons" }
  | { name: "search"; query: string }
  | { name: "meta"; itemType: string; itemId: string };

interface ViewContextType {
  currentView: View;
  navigateTo: (view: View) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>({ name: "home" });

  const navigateTo = (view: View) => {
    setCurrentView(view);
  };

  const value = { currentView, navigateTo };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}
