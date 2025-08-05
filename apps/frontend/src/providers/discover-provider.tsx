"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

export interface DiscoverState {
  selectedType: string;
  selectedProvider: string;
  selectedCatalogId: string;
  extraFilters: Record<string, string>;
  scrollPosition: number;
}

type Action =
  | { type: "SET_STATE"; payload: Partial<DiscoverState> }
  | { type: "RESET_FILTERS" };

// The reducer function to handle state updates
const discoverReducer = (
  state: DiscoverState,
  action: Action,
): DiscoverState => {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "RESET_FILTERS":
      return {
        ...state,
        selectedType: "",
        selectedProvider: "",
        selectedCatalogId: "",
        extraFilters: {},
      };
    default:
      return state;
  }
};

const initialState: DiscoverState = {
  selectedType: "",
  selectedProvider: "",
  selectedCatalogId: "",
  extraFilters: {},
  scrollPosition: 0,
};

interface DiscoverContextType extends DiscoverState {
  dispatch: React.Dispatch<Action>;
}

const DiscoverContext = createContext<DiscoverContextType | undefined>(
  undefined,
);

export function DiscoverProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(discoverReducer, initialState);

  const value = { ...state, dispatch };

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
