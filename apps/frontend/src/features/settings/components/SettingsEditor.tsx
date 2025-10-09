// components/SettingsEditor.tsx
"use client";

import React, { useCallback, useState, useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SettingsSchema, ArraySchema } from "../schemas/settings-schema";
import { useUpdateAdvancedSettings } from "../hooks/useUpdateAdvancedSettings";
import { SettingsSection } from "./SettingsSection";
import { ItemEditorModal } from "./ItemEditorModal";
import { getValueByPath } from "../utils/schema-utils";
import {
  DEFAULT_SETTINGS_DATA,
  DEFAULT_SETTINGS_SCHEMA,
} from "../schemas/settings-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  profileId: string;
  initialSettings: { schema: SettingsSchema[]; data: Record<string, unknown> };
}

export const SettingsEditor: React.FC<Props> = ({
  profileId,
  initialSettings,
}) => {
  const { mutate: updateSettings } = useUpdateAdvancedSettings(profileId);

  const methods = useForm({ defaultValues: initialSettings.data });
  const { reset, getValues, setValue, watch, formState } = methods;

  const debouncedSave = useDebouncedCallback(
    useCallback(
      (data: Record<string, unknown>) => {
        updateSettings(
          { profileId, settings: { schema: DEFAULT_SETTINGS_SCHEMA, data } },
          {
            onSuccess: () => {
              toast.success("Settings saved automatically", {
                icon: <CheckCircle className="h-4 w-4" />,
              });
              reset(data, { keepValues: true, keepDirty: false });
            },
            onError: (err: Error) => {
              toast.error("Failed to save settings", {
                description: err.message,
              });
            },
          },
        );
      },
      [profileId, updateSettings, reset],
    ),
    1200,
  );

  useEffect(() => {
    const subscription = watch((_value, { type }) => {
      // Only save on actual user input, not on programmatic changes
      if (type && formState.isDirty) {
        debouncedSave(getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formState, getValues, debouncedSave]);

  useEffect(() => {
    reset(initialSettings.data);
  }, [initialSettings, reset]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      setValue(detail.path, detail.payload, { shouldDirty: true });
    };
    window.addEventListener("file-uploaded", handler as EventListener);
    return () =>
      window.removeEventListener("file-uploaded", handler as EventListener);
  }, [setValue]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    path: string;
    itemSchema: ArraySchema["itemSchema"] | null;
    itemIndex?: number;
  }>({ isOpen: false, path: "", itemSchema: null });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const openModal = useCallback(
    (
      path: string,
      itemSchema: ArraySchema["itemSchema"],
      itemIndex?: number,
    ) => {
      setModalState({ isOpen: true, path, itemSchema, itemIndex });
    },
    [],
  );

  const closeModal = () => {
    setModalState({ isOpen: false, path: "", itemSchema: null });
  };

  const handleSaveItem = (data: Record<string, unknown>) => {
    const { path, itemIndex } = modalState;
    const currentArray =
      (getValueByPath(getValues(), path) as Record<string, unknown>[]) || [];
    const newArray = [...currentArray];
    if (itemIndex !== undefined) {
      newArray[itemIndex] = data;
    } else {
      newArray.push(data);
    }
    setValue(path, newArray, { shouldDirty: true });
    closeModal();
  };

  const handleResetToDefaults = () => {
    const defaultData = DEFAULT_SETTINGS_DATA;
    reset(defaultData);
    debouncedSave(defaultData);
    setIsResetModalOpen(false);
    toast.info("Settings have been reset to default.");
  };

  const getInitialModalData = () => {
    if (modalState.itemSchema && modalState.itemIndex !== undefined) {
      const arrayData = getValueByPath(getValues(), modalState.path) as Record<
        string,
        unknown
      >[];
      return arrayData?.[modalState.itemIndex] ?? null;
    }
    return null;
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {DEFAULT_SETTINGS_SCHEMA.map((sectionSchema) => (
          <SettingsSection
            key={sectionSchema.name}
            schema={sectionSchema}
            pathPrefix=""
            onEditListItem={openModal}
          />
        ))}

        <div className="mt-8 border-t border-slate-700 pt-6">
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="text-lg">Danger Zone</CardTitle>
              <CardDescription>
                This action is irreversible and will reset all settings to their
                default values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setIsResetModalOpen(true)}
              >
                Reset All Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {modalState.itemSchema && (
        <ItemEditorModal
          isOpen={modalState.isOpen}
          onOpenChange={(open) => !open && closeModal()}
          onSave={handleSaveItem}
          itemSchema={modalState.itemSchema}
          initialData={getInitialModalData()}
        />
      )}

      <AlertDialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all settings to their original defaults. Any
              custom commands, scripts, or other configurations will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>
              Yes, reset settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
};
