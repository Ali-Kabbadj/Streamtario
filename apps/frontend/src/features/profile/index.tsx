"use client";

import { ProfileHeader } from "./components/profile-header";
import { useProfile } from "./hooks/use-profile";

interface ProfileFeatureProps {
  profileId: string;
}

export const ProfileFeature = ({ profileId }: ProfileFeatureProps) => {
  const { data, isLoading, isError, error } = useProfile(profileId);

  if (isError) {
    return (
      <div className="text-red-500">Error loading profile: {error.message}</div>
    );
  }
  const profileData = data?.profile;

  // The component is now much simpler. It just renders its specific content.
  return (
    <div className="space-y-8">
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
