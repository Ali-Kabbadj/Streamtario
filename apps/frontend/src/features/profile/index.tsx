"use client";

import { ProfileHeader } from "./components/profile-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "./hooks/use-profile";

interface ProfileFeatureProps {
  profileId: string;
  onBack: () => void;
}

export const ProfileFeature = ({ profileId, onBack }: ProfileFeatureProps) => {
  const { data, isLoading, isError, error } = useProfile(profileId);

  if (isError) {
    return (
      <div className="text-red-500">Error loading profile: {error.message}</div>
    );
  }
  const profileData = data?.profile;

  return (
    <div className="container mx-auto space-y-8 p-4">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <ProfileHeader
          name={profileData?.name}
          avatar={profileData?.avatar}
          isLoading={isLoading}
        />
      </div>

      <pre className="bg-accent-foreground overflow-x-auto rounded-lg p-4 text-white">
        {isLoading ? "Loading..." : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
