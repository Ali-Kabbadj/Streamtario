"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface ProfileHeaderProps {
  name?: string | null;
  avatar?: string | null;
  isLoading: boolean;
}

export const ProfileHeader = ({
  name,
  avatar,
  isLoading,
}: ProfileHeaderProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar ?? "/default-avatar.png"}
        alt="Profile Avatar"
        className="h-16 w-16 rounded-full"
      />
      <h1 className="text-3xl font-bold">{name ?? "Unnamed Profile"}</h1>
    </div>
  );
};
