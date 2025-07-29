"use client";

import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ProfileContextType {
  selectedProfile: SelectableProfile | null;
  selectProfile: (profile: SelectableProfile | null) => void;
}
export type SelectableProfile = Pick<
  Profile,
  "id" | "name" | "avatar" | "isPrivate"
>;
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [selectedProfile, setSelectedProfile] =
    useState<SelectableProfile | null>(null);

  const selectProfile = (profile: SelectableProfile | null) => {
    setSelectedProfile(profile);
  };

  const value = { selectedProfile, selectProfile };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return context;
}
