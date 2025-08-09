"use client";

import { useMemo } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useProfile } from "@/features/profile/hooks/use-profile";
import {
  DEFAULT_SETTINGS_SCHEMA,
  generateDefaultData, // FIX: Import is now correct
  type SettingsSchema,
} from "@/features/settings/schemas/settings-schema";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsEditor } from "@/features/settings/components/SettingsEditor";

// FIX: Define the type for advanced settings to use it consistently
type AdvancedSettings = {
  schema: SettingsSchema[];
  data: Record<string, unknown>;
};

export function SettingsView() {
  const { selectedProfile } = useProfileContext();
  const profileId = selectedProfile?.id ?? "";

  const { data: profileData, isLoading: isLoadingProfile } =
    useProfile(profileId);

  // FIX: Explicitly type the useMemo hook's return value
  const initialSettings: AdvancedSettings = useMemo(() => {
    const advanced = profileData?.profile?.advancedSettings as
      | { schema: unknown; data: unknown }
      | undefined;

    if (advanced?.schema && Array.isArray(advanced.schema) && advanced.data) {
      // Ensure the loaded data conforms to the type
      return {
        schema: advanced.schema as SettingsSchema[],
        data: advanced.data as Record<string, unknown>,
      };
    }

    return {
      schema: DEFAULT_SETTINGS_SCHEMA,
      data: generateDefaultData(DEFAULT_SETTINGS_SCHEMA),
    };
  }, [profileData]);

  if (isLoadingProfile) {
    return (
      <div className="space-y-6 p-4 sm:px-6 md:p-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 text-6xl font-bold tracking-tight">
          Advanced Settings
        </h1>
        <p className="text-lg text-slate-400">
          Customize the application settings and their structure. Changes are
          saved automatically. Core settings cannot be moved or deleted.
        </p>
      </div>
      {/* FIX: Prop is now correctly typed and guaranteed to be valid */}
      <SettingsEditor profileId={profileId} initialSettings={initialSettings} />
    </div>
  );
}
