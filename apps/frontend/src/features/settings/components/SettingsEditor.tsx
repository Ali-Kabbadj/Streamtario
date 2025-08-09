// components/SettingsEditor.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getDefaultValueForSchema,
  findSchemaItem,
} from "../utils/schema-utils";
import {
  DEFAULT_SETTINGS_SCHEMA,
  generateDefaultData,
} from "../schemas/settings-schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type AdvancedSettings = {
  schema: SettingsSchema[];
  data: Record<string, unknown>;
};

interface Props {
  profileId: string;
  initialSettings: AdvancedSettings;
}

export const SettingsEditor: React.FC<Props> = ({
  profileId,
  initialSettings,
}) => {
  const [schema, setSchema] = useState<SettingsSchema[]>(
    initialSettings.schema,
  );
  const { mutate: updateSettings } = useUpdateAdvancedSettings(profileId);

  const methods = useForm({ defaultValues: initialSettings.data });
  const { watch, reset, getValues, setValue, register, formState } = methods;

  const debouncedSave = useDebouncedCallback((payload: AdvancedSettings) => {
    updateSettings(
      { profileId, settings: payload },
      {
        onSuccess: () => {
          toast.success("Settings saved automatically", {
            icon: <CheckCircle className="h-4 w-4" />,
          });
          reset(payload.data, { keepValues: true, keepDirty: false });
        },
        onError: (err: any) => {
          toast.error("Failed to save settings", {
            description: err?.message ?? String(err),
          });
        },
      },
    );
  }, 1200);

  useEffect(() => {
    const sub = watch(() => {
      if (formState.isDirty) {
        debouncedSave({ schema, data: getValues() });
      }
    });
    return () => sub.unsubscribe();
  }, [watch, formState.isDirty, getValues, schema, debouncedSave]);

  useEffect(() => {
    setSchema(initialSettings.schema);
    reset(initialSettings.data);
  }, [initialSettings, reset]);

  useEffect(() => {
    // listen for file-uploaded events from FileUploadPanel inside Schema items
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      const { path, payload } = detail as { path: string; payload: any };
      // write to react-hook-form; path expected dotted like "mpv.mpv_conf_file"
      try {
        setValue(path, payload, { shouldDirty: true });
        toast.success(`Uploaded ${payload.filename} (staged)`);
      } catch (err) {
        console.warn("file upload setValue failed", err);
        toast.error("Failed to attach uploaded file to form");
      }
    };
    window.addEventListener("file-uploaded", handler as EventListener);
    return () =>
      window.removeEventListener("file-uploaded", handler as EventListener);
  }, [setValue]);

  const handleSchemaChange = useCallback(
    (nschema: SettingsSchema[], newData?: Record<string, unknown>) => {
      setSchema(nschema);
      debouncedSave({ schema: nschema, data: newData ?? getValues() });
    },
    [getValues, debouncedSave],
  );

  // modal & delete
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<{
    path: string;
    isAddingChild: boolean;
  } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const openEditor = useCallback((path: string, isAddingChild = false) => {
    setEditingInfo({ path, isAddingChild });
    setIsModalOpen(true);
  }, []);

  const requestDelete = useCallback((path: string) => {
    setDeletingPath(path);
    setIsDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deletingPath) return;
    const newSchema = produce(schema, (draft) => {
      const res = findNodeAndParent(deletingPath.split("."), draft);
      if (res?.node && !res.node.isCore) {
        res.items.splice(res.index, 1);
      }
    });

    const newValues = produce(getValues(), (draft: any) => {
      const parts = deletingPath.split(".");
      const last = parts.pop();
      let cur: any = draft;
      for (const p of parts) {
        if (cur && p in cur) cur = cur[p];
        else return;
      }
      if (last && cur && typeof cur === "object") delete cur[last];
    });

    reset(newValues);
    handleSchemaChange(newSchema, newValues);
    setIsDeleteOpen(false);
    setDeletingPath(null);
  }, [deletingPath, getValues, reset, schema, handleSchemaChange]);

  const handleSaveSchema = useCallback(
    (s: SettingsSchema) => {
      if (!editingInfo) return;
      const { path, isAddingChild } = editingInfo;

      const newSchema = produce(schema, (draft) => {
        if (isAddingChild) {
          const parent = findSchemaItem(path.split("."), draft);
          if (parent && parent.type === "object") {
            parent.fields.push(s);
          }
        } else if (path) {
          const existing = findNodeAndParent(path.split("."), draft);
          if (existing?.node && !existing.node.isCore) {
            existing.items[existing.index] = s;
          }
        } else {
          draft.push(s);
        }
      });

      const newPath = isAddingChild
        ? `${path}.${s.name}`
        : path
          ? path.replace(/[^.]+$/, s.name)
          : s.name;
      if (!findSchemaItem(newPath.split("."), schema)) {
        setValue(newPath, getDefaultValueForSchema(s), { shouldDirty: true });
      }

      handleSchemaChange(newSchema);
      setIsModalOpen(false);
      setEditingInfo(null);
    },
    [editingInfo, schema, handleSchemaChange, setValue],
  );

  const editingSchemaItem =
    editingInfo && !editingInfo.isAddingChild && editingInfo.path
      ? findSchemaItem(editingInfo.path.split("."), schema)
      : null;

  // reset modal state (use AlertDialog)
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const triggerReset = useCallback(() => setResetModalOpen(true), []);
  const performReset = useCallback(() => {
    const defaults = DEFAULT_SETTINGS_SCHEMA;
    const defaultData = generateDefaultData(DEFAULT_SETTINGS_SCHEMA);
    setSchema(defaults);
    reset(defaultData);
    handleSchemaChange(defaults, defaultData);
    setResetModalOpen(false);
    toast.success("Reset to defaults");
  }, [handleSchemaChange, reset]);

  const [mode, setMode] = useState<"basic" | "advanced">("basic");

  const basicView = useMemo(() => {
    return (
      <div className="space-y-4">
        {schema.map((s) => (
          <Card
            key={s.name}
            className={
              s.isCore ? "border-dashed border-slate-600 bg-slate-900/40" : ""
            }
          >
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{s.label}</CardTitle>
                {s.description && (
                  <div className="text-sm text-slate-400">{s.description}</div>
                )}
              </div>

              <div className="flex gap-2">
                {s.isCore && (s as any).isExtensible && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditor(s.name, true)}
                    >
                      Add to {s.label}
                    </Button>
                    {/* Upload quick action maps to event so inner upload UI can be nested too */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("trigger-upload", {
                            detail: { targetPath: `${s.name}.mpv_conf` },
                          }),
                        )
                      }
                    >
                      Upload file
                    </Button>
                  </>
                )}
                {!s.isCore && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditor(s.name, false)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {s.type === "object" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {s.fields.map((f) => {
                    const inputName = `${s.name}.${f.name}`;
                    if (f.type === "string") {
                      return (
                        <div
                          key={f.name}
                          className="rounded-md border border-slate-800 p-2"
                        >
                          <label className="text-xs text-slate-400">
                            {f.label}
                          </label>
                          <input
                            {...register(inputName)}
                            className="mt-1 w-full rounded border bg-transparent p-1 text-sm"
                          />
                        </div>
                      );
                    }
                    if (f.type === "number") {
                      return (
                        <div
                          key={f.name}
                          className="rounded-md border border-slate-800 p-2"
                        >
                          <label className="text-xs text-slate-400">
                            {f.label}
                          </label>
                          <input
                            type="number"
                            {...register(inputName, { valueAsNumber: true })}
                            className="mt-1 w-full rounded border bg-transparent p-1 text-sm"
                          />
                        </div>
                      );
                    }
                    if (f.type === "boolean") {
                      return (
                        <div
                          key={f.name}
                          className="flex items-center gap-2 rounded-md border border-slate-800 p-2"
                        >
                          <input type="checkbox" {...register(inputName)} />
                          <label className="text-sm">{f.label}</label>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {s.type === "array" && (
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">{s.description}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(s.name, true)}
                  >
                    Manage {s.label}
                  </Button>
                </div>
              )}

              {s.type !== "object" && s.type !== "array" && (
                <div>
                  <label className="text-xs text-slate-400">{s.label}</label>
                  <input
                    {...register(s.name)}
                    className="mt-1 w-full rounded border bg-transparent p-1 text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [schema, register, openEditor]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded px-3 py-1 ${mode === "basic" ? "bg-blue-600 text-white" : "border"}`}
              onClick={() => setMode("basic")}
            >
              Basic
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1 ${mode === "advanced" ? "bg-blue-600 text-white" : "border"}`}
              onClick={() => setMode("advanced")}
            >
              Advanced
            </button>
          </div>

          {mode === "advanced" && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={triggerReset}>
                Reset to defaults
              </Button>
            </div>
          )}
        </div>

        {mode === "basic" ? (
          basicView
        ) : (
          <>
            <SchemaEditor
              schema={schema}
              onSchemaChange={handleSchemaChange}
              onEdit={(p) => openEditor(p, false)}
              onDelete={requestDelete}
              onAddChild={(p) => openEditor(p, true)}
            />
            <div className="flex justify-center pt-6">
              <Button variant="outline" onClick={() => openEditor("", false)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Root Field
              </Button>
            </div>
          </>
        )}
      </form>

      <SchemaFieldEditorModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingInfo(null);
        }}
        onSave={handleSaveSchema}
        initialSchema={editingSchemaItem}
      />

      {/* Delete dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete setting?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting will remove the schema entry and stored value. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset dialog */}
      <AlertDialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset settings and layout</AlertDialogTitle>
            <AlertDialogDescription>
              Reset will restore default schema and default values. This
              operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
};
