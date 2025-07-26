"use client";

import { useProfile } from "@/api/hooks/use-profile";
import { ProfileHeader } from "./components/profile-header";

// A hardcoded ID for demonstration purposes.
const DEMO_PROFILE_ID = "8e86475c-cddd-441e-bdc3-7c9279310379";

export const ProfileFeature = () => {
  const { data, isLoading, isError, error } = useProfile(DEMO_PROFILE_ID);

  if (isError) {
    return (
      <div className="text-red-500">Error loading profile: {error.message}</div>
    );
  }

  // The `data` object is fully typed!
  // TypeScript knows `data.profile.discoverableCatalogs` exists and knows its shape.
  const profileData = data?.profile;

  return (
    <div className="container mx-auto space-y-8 p-4">
      <ProfileHeader
        name={profileData?.name}
        avatar={profileData?.avatar}
        isLoading={isLoading}
      />
      {/* Here you could map over `profileData?.discoverableCatalogs` and other data */}
      {/* to render the rest of the UI, passing data to smaller, dumber components. */}
      <pre className="overflow-x-auto rounded-lg bg-slate-800 p-4 text-white">
        {isLoading ? "Loading..." : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
