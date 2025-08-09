// components/SettingsView.tsx
"use client";

import React, { useMemo } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useProfile } from "@/features/profile/hooks/use-profile";
import {
  DEFAULT_SETTINGS_SCHEMA,
  generateDefaultData,
  type SettingsSchema,
} from "@/features/settings/schemas/settings-schema";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsEditor } from "@/features/settings/components/SettingsEditor";

type AdvancedSettings = {
  schema: SettingsSchema[];
  data: Record<string, unknown>;
};

export function SettingsView() {
  const { selectedProfile } = useProfileContext();
  const profileId = selectedProfile?.id ?? "";

  const { data: profileData, isLoading: isLoadingProfile } =
    useProfile(profileId);

  const initialSettings: AdvancedSettings = useMemo(() => {
    const advanced = profileData?.profile?.advancedSettings as
      | { schema?: unknown; data?: unknown }
      | undefined;
    if (advanced?.schema && Array.isArray(advanced.schema) && advanced.data) {
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
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          Advanced Settings
        </h1>
        <p className="text-lg text-slate-400">
          Customize the app settings and schema. Use Basic for quick edits or
          Advanced for schema-level control.
        </p>
      </div>

      <SettingsEditor profileId={profileId} initialSettings={initialSettings} />
    </div>
  );
}
