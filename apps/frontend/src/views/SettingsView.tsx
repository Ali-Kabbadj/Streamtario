"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useProfile } from "@/features/profile/hooks/use-profile";
import type { SettingsSchema } from "@/features/settings/schemas/settings-schema";
import {
  DEFAULT_SETTINGS_SCHEMA,
  DEFAULT_SETTINGS_DATA,
} from "@/features/settings/schemas/settings-schema";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, PlusCircle } from "lucide-react";
import { useUpdateAdvancedSettings } from "@/features/settings/hooks/useUpdateAdvancedSettings";
import { FormProvider, useForm } from "react-hook-form";
import { produce } from "immer";
import { SchemaEditor } from "@/features/settings/components/SchemaEditor";
import { useDebouncedCallback } from "use-debounce";
import { SchemaFieldEditorModal } from "@/features/settings/components/SchemaFieldEditorModal";
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
import {
  findNodeAndParent,
  findSchemaItem,
} from "@/features/settings/utils/schema-utils";
import { Button } from "@/components/ui/button";
import { SettingsFormProvider } from "@/features/settings/components/SettingsFormContext";

type AdvancedSettings = {
  schema: SettingsSchema[];
  data: Record<string, unknown>;
};

export function SettingsView() {
  const { selectedProfile } = useProfileContext();
  const profileId = selectedProfile?.id ?? "";

  const [schema, setSchema] = useState<SettingsSchema[]>(
    DEFAULT_SETTINGS_SCHEMA,
  );

  const { data: profileData, isLoading: isLoadingProfile } =
    useProfile(profileId);
  const { mutate: updateSettings } = useUpdateAdvancedSettings(profileId);

  const methods = useForm();
  const { reset, getValues, setValue } = methods;

  const debouncedSave = useDebouncedCallback(
    (dataToSave: Record<string, unknown>, newSchema: SettingsSchema[]) => {
      updateSettings(
        { profileId, settings: { schema: newSchema, data: dataToSave } },
        {
          onSuccess: () => {
            toast.success("Settings saved automatically", {
              icon: <CheckCircle className="h-4 w-4" />,
            });
            reset(dataToSave, { keepValues: true, keepDirty: false });
          },
          onError: (error) => {
            toast.error("Failed to save settings", {
              description: error.message,
            });
          },
        },
      );
    },
    1500,
  );

  const triggerSave = useCallback(() => {
    debouncedSave(getValues(), schema);
  }, [getValues, schema, debouncedSave]);

  useEffect(() => {
    const advanced = profileData?.profile?.advancedSettings as
      | AdvancedSettings
      | undefined;
    if (advanced?.schema && advanced?.data) {
      setSchema(advanced.schema);
      reset(advanced.data);
    } else if (profileData) {
      setSchema(DEFAULT_SETTINGS_SCHEMA);
      reset(DEFAULT_SETTINGS_DATA);
    }
  }, [profileData, reset]);

  const handleSchemaChange = (newSchema: SettingsSchema[]) => {
    setSchema(newSchema);
    debouncedSave(getValues(), newSchema);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const handleEdit = (path: string) => setEditingPath(path);
  const handleAddChild = (path: string) => setEditingPath(`${path}.`);
  const handleDeleteRequest = (path: string) => {
    setDeletingPath(path);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingPath) return;
    const newSchema = produce(schema, (draft) => {
      const result = findNodeAndParent(deletingPath.split("."), draft);
      if (result && !result.node.isCore) {
        result.items.splice(result.index, 1);
      }
    });
    // This logic needs to be expanded to handle data deletion in nested objects
    handleSchemaChange(newSchema);
    setIsDeleteDialogOpen(false);
    setDeletingPath(null);
  };

  const handleSaveSchema = (newItem: SettingsSchema) => {
    const path = editingPath?.endsWith(".")
      ? editingPath.slice(0, -1)
      : editingPath;
    const isAdding = editingPath?.endsWith(".");

    const newSchema = produce(schema, (draft) => {
      if (isAdding) {
        const parentPath = path ? path.split(".") : [];
        if (parentPath.length === 0) {
          draft.push(newItem);
        } else {
          const result = findNodeAndParent(parentPath, draft);
          const container =
            result?.node.type === "object" ? result.node.fields : draft;
          if (container) container.push(newItem);
        }
      } else {
        const itemPath = path ? path.split(".") : [];
        const result = findNodeAndParent(itemPath, draft);
        if (result && !result.node.isCore) {
          result.items[result.index] = newItem;
        }
      }
    });

    if (isAdding && "defaultValue" in newItem) {
      setValue((editingPath ?? "") + newItem.name, newItem.defaultValue);
    }

    handleSchemaChange(newSchema);
    setEditingPath(null);
  };
  const editingSchemaItem =
    editingPath && !editingPath.endsWith(".")
      ? findSchemaItem(editingPath.split("."), schema)
      : null;

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
          saved automatically.
        </p>
      </div>
      <SettingsFormProvider value={{ triggerSave }}>
        <FormProvider {...methods}>
          <form>
            <SchemaEditor
              schema={schema}
              onSchemaChange={handleSchemaChange}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onAddChild={handleAddChild}
            />
          </form>
        </FormProvider>
      </SettingsFormProvider>
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={() => setEditingPath("")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Root Field
        </Button>
      </div>
      <SchemaFieldEditorModal
        isOpen={!!editingPath}
        onOpenChange={(isOpen) => !isOpen && setEditingPath(null)}
        onSave={handleSaveSchema}
        initialSchema={editingSchemaItem}
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the setting field and any data
              associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
