"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { ProfileFeature } from "@/features/profile";
import { AuthFeature } from "@/features/auth";
import { ProfileSelectionFeature } from "@/features/profile-selection";
import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

export type SelectableProfile = Pick<
  Profile,
  "id" | "name" | "avatar" | "isPrivate"
>;

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [selectedProfile, setSelectedProfile] =
    useState<SelectableProfile | null>(null);

  if (isAuthenticated && user) {
    if (selectedProfile) {
      return (
        <main className="text-foreground min-h-screen">
          <ProfileFeature
            profileId={selectedProfile.id}
            onBack={() => setSelectedProfile(null)}
          />
        </main>
      );
    }
    return <ProfileSelectionFeature onProfileSelect={setSelectedProfile} />;
  }

  return <AuthFeature />;
}
