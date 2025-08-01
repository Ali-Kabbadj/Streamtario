"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "addons" }
  | { name: "search"; query: string }
  | { name: "meta"; itemType: string; itemId: string };

interface ViewContextType {
  viewStack: View[];
  currentView: View;
  navigateTo: (view: View) => void;
  navigateBack: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [viewStack, setViewStack] = useState<View[]>([{ name: "home" }]);

  const navigateTo = (view: View) => {
    setViewStack((prevStack) => [...prevStack, view]);
  };

  const navigateBack = () => {
    setViewStack((prevStack) =>
      prevStack.length > 1 ? prevStack.slice(0, -1) : prevStack,
    );
  };

  const currentView = viewStack[viewStack.length - 1];
  const value: ViewContextType = {
    viewStack,
    currentView: currentView ?? { name: "home" }, // Use nullish coalescing operator
    navigateTo,
    navigateBack,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}
