"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface DiscoverState {
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedCatalogId: string;
  setSelectedCatalogId: (catalogId: string) => void;
  extraFilters: Record<string, string>;
  setExtraFilters: (filters: Record<string, string>) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  resetFilters: () => void;
}

const DiscoverContext = createContext<DiscoverState | undefined>(undefined);

export function DiscoverProvider({ children }: { children: ReactNode }) {
  const [selectedType, setSelectedType] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});
  const [scrollPosition, setScrollPosition] = useState(0);

  const resetFilters = () => {
    setSelectedType("");
    setSelectedProvider("all");
    setSelectedCatalogId("");
    setExtraFilters({});
  };

  const value = {
    selectedType,
    setSelectedType,
    selectedProvider,
    setSelectedProvider,
    selectedCatalogId,
    setSelectedCatalogId,
    extraFilters,
    setExtraFilters,
    scrollPosition,
    setScrollPosition,
    resetFilters,
  };

  return (
    <DiscoverContext.Provider value={value}>
      {children}
    </DiscoverContext.Provider>
  );
}

export function useDiscoverContext() {
  const context = useContext(DiscoverContext);
  if (context === undefined) {
    throw new Error(
      "useDiscoverContext must be used within a DiscoverProvider",
    );
  }
  return context;
}
