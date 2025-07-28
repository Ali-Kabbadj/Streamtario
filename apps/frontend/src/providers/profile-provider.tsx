"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type ProfileContextType = {
  selectedProfile: Pick<Profile, "id" | "name" | "avatar"> | null;
  selectProfile: (profile: Pick<Profile, "id" | "name" | "avatar">) => void;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [selectedProfile, setSelectedProfile] = useState<Pick<
    Profile,
    "id" | "name" | "avatar"
  > | null>(null);

  const selectProfile = (profile: Pick<Profile, "id" | "name" | "avatar">) => {
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
