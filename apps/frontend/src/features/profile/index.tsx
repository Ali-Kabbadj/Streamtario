"use client";

import { useProfile } from "@/api/hooks/use-profile";
import { ProfileHeader } from "./components/profile-header";

export const ProfileFeature = ({ profileId }: { profileId: string }) => {
  const { data, isLoading, isError, error } = useProfile(profileId);

  if (isError) {
    return (
      <div className="text-red-500">Error loading profile: {error.message}</div>
    );
  }
  const profileData = data?.profile;

  return (
    <div className="container mx-auto space-y-8 p-4">
      <ProfileHeader
        name={profileData?.name}
        avatar={profileData?.avatar}
        isLoading={isLoading}
      />

      <pre className="overflow-x-auto rounded-lg bg-slate-800 p-4 text-white">
        {isLoading ? "Loading..." : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
