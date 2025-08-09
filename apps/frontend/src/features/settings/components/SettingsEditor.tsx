/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { produce } from "immer";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { CheckCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { SettingsSchema } from "../schemas/settings-schema";
import { useUpdateAdvancedSettings } from "../hooks/useUpdateAdvancedSettings";
import { SchemaEditor } from "./SchemaEditor";
import { SchemaFieldEditorModal } from "./SchemaFieldEditorModal";
import {
  findNodeAndParent,
  findSchemaItem,
  getDefaultValueForSchema,
} from "../utils/schema-utils";

type AdvancedSettings = {
  schema: SettingsSchema[];
  data: Record<string, unknown>;
};

interface SettingsEditorProps {
  profileId: string;
  initialSettings: AdvancedSettings;
}

const SettingsEditorComponent = ({
  profileId,
  initialSettings,
}: SettingsEditorProps) => {
  const [schema, setSchema] = useState<SettingsSchema[]>(
    initialSettings.schema,
  );
  const { mutate: updateSettings } = useUpdateAdvancedSettings(profileId);

  const methods = useForm({
    defaultValues: initialSettings.data,
  });
  const { reset, getValues, watch, formState, setValue } = methods;

  const debouncedSave = useDebouncedCallback((settings: AdvancedSettings) => {
    updateSettings(
      { profileId, settings },
      {
        onSuccess: () => {
          toast.success("Settings saved automatically", {
            icon: <CheckCircle className="h-4 w-4" />,
          });
          reset(settings.data, { keepValues: true, keepDirty: false });
        },
        onError: (error) => {
          toast.error("Failed to save settings", {
            description: error.message,
          });
        },
      },
    );
  }, 1500);

  useEffect(() => {
    const subscription = watch((_value, { name: _name, type: _type }) => {
      if (formState.isDirty) {
        debouncedSave({ schema, data: getValues() });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formState.isDirty, schema, getValues, debouncedSave]);

  useEffect(() => {
    setSchema(initialSettings.schema);
    reset(initialSettings.data);
  }, [initialSettings, reset]);

  const handleSchemaChange = useCallback(
    (newSchema: SettingsSchema[], newData?: Record<string, unknown>) => {
      setSchema(newSchema);
      debouncedSave({ schema: newSchema, data: newData ?? getValues() });
    },
    [getValues, debouncedSave],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<{
    path: string;
    isAddingChild: boolean;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const handleOpenModal = useCallback((path: string, isAddingChild = false) => {
    setEditingInfo({ path, isAddingChild });
    setIsModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((path: string) => {
    setDeletingPath(path);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = () => {
    if (!deletingPath) return;

    const newValues = produce(getValues(), (draft) => {
      const pathParts = deletingPath.split(".");
      const lastPart = pathParts.pop();
      // FIX: Cast to `any` here is a pragmatic way to solve the complex immer/draft typing issue.
      let current: any = draft;
      for (const part of pathParts) {
        if (
          typeof current === "object" &&
          current !== null &&
          part in current
        ) {
          current = current[part];
        } else {
          return;
        }
      }
      if (lastPart && typeof current === "object" && current !== null) {
        delete current[lastPart];
      }
    });

    const newSchema = produce(schema, (draft) => {
      const result = findNodeAndParent(deletingPath.split("."), draft);
      if (result && !result.node.isCore) {
        result.items.splice(result.index, 1);
      }
    });

    reset(newValues);
    handleSchemaChange(newSchema, newValues);
    setIsDeleteDialogOpen(false);
    setDeletingPath(null);
  };

  const handleSaveSchema = (newItem: SettingsSchema) => {
    if (!editingInfo) return;
    const { path, isAddingChild } = editingInfo;

    const newSchema = produce(schema, (draft) => {
      if (isAddingChild) {
        const parent = findSchemaItem(path.split("."), draft);
        if (parent?.type === "object") {
          parent.fields.push(newItem);
        }
      } else if (path) {
        const result = findNodeAndParent(path.split("."), draft);
        if (result && !result.node.isCore) {
          result.items[result.index] = newItem;
        }
      } else {
        draft.push(newItem);
      }
    });

    const newPath = isAddingChild
      ? `${path}.${newItem.name}`
      : path
        ? path.replace(/[^.]+$/, newItem.name)
        : newItem.name;
    if (!findSchemaItem(newPath.split("."), schema)) {
      setValue(newPath, getDefaultValueForSchema(newItem), {
        shouldDirty: true,
      });
    }

    handleSchemaChange(newSchema);
    setIsModalOpen(false);
    setEditingInfo(null);
  };

  const editingSchemaItem =
    editingInfo && !editingInfo.isAddingChild && editingInfo.path
      ? findSchemaItem(editingInfo.path.split("."), schema)
      : null;

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()}>
        <SchemaEditor
          schema={schema}
          onSchemaChange={handleSchemaChange}
          onEdit={(path) => handleOpenModal(path, false)}
          onDelete={handleDeleteRequest}
          onAddChild={(path) => handleOpenModal(path, true)}
        />

        <div className="flex justify-center pt-8">
          <Button variant="outline" onClick={() => handleOpenModal("")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Root Field
          </Button>
        </div>
      </form>

      <SchemaFieldEditorModal
        isOpen={isModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingInfo(null);
          setIsModalOpen(isOpen);
        }}
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
              This will permanently delete the setting field and all its
              associated data. This action cannot be undone.
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
    </FormProvider>
  );
};

export const SettingsEditor = memo(SettingsEditorComponent);
