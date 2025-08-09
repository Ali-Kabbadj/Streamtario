// components/SortableSchemaItem.tsx
"use client";

import React, { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { SettingsSchema, FieldSchema } from "../schemas/settings-schema";
import { SettingsFormField } from "./SettingsFormField";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { TopRightControls } from "./TopRightControls";
import { FileUploadPanel } from "./FileUploadPanel";
import type { DropPosition } from "./SchemaEditor";

/**
 * Updated so TopRightControls is absolutely positioned in the top-right corner
 * of the card and smaller.
 */

interface Props {
  id: string;
  schema: SettingsSchema;
  path: string;
  isOver: boolean;
  dropPosition: DropPosition | null;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
}

export const SortableSchemaItem: React.FC<Props> = React.memo(
  function SortableSchemaItem({
    id,
    schema,
    path,
    isOver,
    dropPosition,
    onEdit,
    onDelete,
    onAddChild,
  }) {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
      control,
      name: path,
    });

    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      isDragging,
    } = useDraggable({ id, data: { path, schema }, disabled: !!schema.isCore });
    const { setNodeRef: setDroppableNodeRef } = useDroppable({ id });

    const setNodeRef = useCallback(
      (node: HTMLElement | null) => {
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
      },
      [setDraggableNodeRef, setDroppableNodeRef],
    );

    const isField = (s: SettingsSchema): s is FieldSchema =>
      ["string", "number", "boolean"].includes(s.type);

    const showNestIndicator = isOver && dropPosition === "nest";

    const cardBase = cn("relative overflow-visible"); // relative so TopRightControls absolute works

    if (schema.type === "object") {
      return (
        <div
          ref={setNodeRef}
          className={cn(cardBase, isDragging ? "opacity-50" : "opacity-100")}
          data-dnd-id={id}
        >
          <Card
            className={cn("border border-slate-700 bg-slate-900/50", {
              "border-dashed border-slate-600": schema.isCore,
            })}
          >
            <div className="relative">
              <CardHeader className="flex items-start justify-between pr-10">
                <div>
                  <CardTitle className="text-base">{schema.label}</CardTitle>
                </div>
              </CardHeader>

              {/* TopRightControls placed here, absolute */}
              <TopRightControls
                onEdit={() => onEdit(path)}
                onDelete={() => onDelete(path)}
                onAddChild={() => onAddChild(path)}
                dragListeners={{ ...attributes, ...listeners }}
                isCore={!!schema.isCore}
              />
            </div>

            <CardContent
              className={cn("pt-2 pr-4 pb-4 pl-6", {
                "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900":
                  showNestIndicator,
              })}
            >
              <div className="space-y-3">
                {schema.fields.map((f) => (
                  <SortableSchemaItem
                    key={f.name}
                    id={`${path}.${f.name}`}
                    schema={f}
                    path={`${path}.${f.name}`}
                    isOver={isOver}
                    dropPosition={dropPosition}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddChild={onAddChild}
                  />
                ))}
              </div>

              {!schema.isCore && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddChild(path)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                  </Button>
                </div>
              )}

              {/* if this node is mpv (or isExtensible and accepts confs) show upload panel inline */}
              {schema.name === "mpv" && (
                <div className="mt-3">
                  <FileUploadPanel
                    accept=".conf,text/*"
                    title="Upload mpv.conf"
                    onUploaded={(p) => {
                      // write prepared payload into form manually; parent component (SettingsEditor) has react-hook-form.
                      // we cannot access it's setValue here — expect a handler or global action to persist.
                      // To keep self-contained, we dispatch a CustomEvent which the SettingsEditor listens to.
                      window.dispatchEvent(
                        new CustomEvent("file-uploaded", {
                          detail: {
                            path: `${path}.mpv_conf_file`,
                            payload: p,
                          },
                        }),
                      );
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (schema.type === "array") {
      const handleAppend = () => {
        const template: Record<string, unknown> = {};
        for (const f of schema.itemSchema.fields)
          template[f.name] = f.defaultValue ?? null;
        append(template);
      };

      return (
        <div
          ref={setNodeRef}
          className={cn(cardBase, isDragging ? "opacity-50" : "opacity-100")}
          data-dnd-id={id}
        >
          <Card
            className={cn("border border-slate-700 bg-slate-900/50", {
              "border-dashed border-slate-600": schema.isCore,
            })}
          >
            <div className="relative">
              <CardHeader className="flex items-start justify-between pr-10">
                <div>
                  <CardTitle className="text-base">{schema.label}</CardTitle>
                </div>
              </CardHeader>

              <TopRightControls
                onEdit={() => onEdit(path)}
                onDelete={() => onDelete(path)}
                dragListeners={{ ...attributes, ...listeners }}
                isCore={!!schema.isCore}
              />
            </div>

            <CardContent className="space-y-3 pt-2 pr-4 pb-4 pl-6">
              <div className="space-y-2">
                {fields.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-800 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      {schema.itemSchema.fields.map((fs) => (
                        <div key={fs.name}>
                          <SettingsFormField
                            schema={fs}
                            path={`${path}.${idx}.${fs.name}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Button variant="outline" size="sm" onClick={handleAppend}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add {schema.itemLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // primitive field
    return (
      <div
        ref={setNodeRef}
        className={cn(cardBase, isDragging ? "opacity-50" : "opacity-100")}
        data-dnd-id={id}
      >
        <div
          className={cn("relative rounded-lg p-3 transition-all", {
            "border border-dashed border-slate-700": schema.isCore,
          })}
        >
          {isField(schema) && <SettingsFormField schema={schema} path={path} />}
          <TopRightControls
            onEdit={() => onEdit(path)}
            onDelete={() => onDelete(path)}
            dragListeners={{ ...attributes, ...listeners }}
            isCore={!!schema.isCore}
          />
        </div>
      </div>
    );
  },
);
