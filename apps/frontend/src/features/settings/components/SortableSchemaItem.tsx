"use client";

import React from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useFieldArray, useFormContext } from "react-hook-form";
import { CSS } from "@dnd-kit/utilities";
import type { SettingsSchema, FieldSchema } from "../schemas/settings-schema";
import { SchemaItemControls } from "./SchemaItemControls";
import { SettingsFormField } from "./SettingsFormField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import type { DropPosition } from "./SchemaEditor"; // FIX: Import DropPosition type

interface SortableSchemaItemProps {
  id: string;
  schema: SettingsSchema;
  path: string;
  // FIX: Add new props for indicator logic
  isOver: boolean;
  dropPosition: DropPosition;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
}

export const SortableSchemaItem = React.memo(function SortableSchemaItem({
  id,
  schema,
  path,
  isOver,
  dropPosition,
  onEdit,
  onDelete,
  onAddChild,
}: SortableSchemaItemProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: path });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { path, schema }, disabled: !!schema.isCore });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isField = (s: SettingsSchema): s is FieldSchema => {
    return ["string", "number", "boolean"].includes(s.type);
  };

  // FIX: Logic to determine if the nesting indicator should be shown
  const showNestIndicator = isOver && dropPosition === "nest";

  const childIds = React.useMemo(() => {
    if (schema.type === "object") {
      return schema.fields.map((field) => `${path}.${field.name}`);
    }
    return [];
  }, [schema, path]);

  // Assign a specific data attribute for the DropIndicator to find
  const dndProps = { "data-dnd-id": id };

  // --- START: RENDER LOGIC ---

  if (schema.type === "object") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group/item relative"
        {...dndProps}
      >
        <Card
          className={cn(
            "border-slate-700 bg-slate-900/50 transition-all",
            { "border-dashed border-slate-600": schema.isCore },
            // FIX: Apply a ring when this item is a valid nest target
            {
              "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900":
                showNestIndicator,
            },
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{schema.label}</span>
              <SchemaItemControls
                attributes={attributes}
                listeners={listeners}
                onEdit={() => onEdit(path)}
                onDelete={() => onDelete(path)}
                isCore={!!schema.isCore}
              />
            </CardTitle>
            {schema.description && (
              <p className="pt-1 text-sm text-slate-400">
                {schema.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pr-4 pb-4 pl-6">
            <SortableContext
              items={childIds}
              strategy={verticalListSortingStrategy}
            >
              {schema.fields.map((field) => (
                <SortableSchemaItem
                  key={field.name}
                  id={`${path}.${field.name}`}
                  schema={field}
                  path={`${path}.${field.name}`}
                  isOver={isOver}
                  dropPosition={dropPosition}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                />
              ))}
            </SortableContext>
            {!schema.isCore && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddChild(path)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Field to{" "}
                  {schema.label}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (schema.type === "array") {
    const handleAddItem = () => {
      const newItem = schema.itemSchema.fields.reduce(
        (acc, field) => {
          acc[field.name] = field.defaultValue;
          return acc;
        },
        {} as Record<string, unknown>,
      );
      append(newItem);
    };

    return (
      <div ref={setNodeRef} style={style} className="group/item relative">
        <Card
          className={cn("border-slate-700 bg-slate-900/50", {
            "border-dashed border-slate-600": schema.isCore,
          })}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{schema.label}</span>
              <SchemaItemControls
                attributes={attributes}
                listeners={listeners}
                onEdit={() => onEdit(path)}
                onDelete={() => onDelete(path)}
                isCore={!!schema.isCore}
              />
            </CardTitle>
            {schema.description && (
              <p className="pt-1 text-sm text-slate-400">
                {schema.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pr-4 pb-4 pl-6">
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-md border border-slate-800 p-3"
                >
                  <div className="flex-grow space-y-4">
                    {schema.itemSchema.fields.map((fieldSchema) => (
                      <SettingsFormField
                        key={fieldSchema.name}
                        schema={fieldSchema}
                        path={`${path}.${index}.${fieldSchema.name}`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-500 hover:text-red-400"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add {schema.itemLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for FieldSchema types
  return (
    <div ref={setNodeRef} style={style} className="group/item relative">
      <div
        className={cn(
          "relative rounded-lg p-4 transition-colors",
          {
            "border border-transparent bg-slate-800/60 hover:border-slate-700":
              !schema.isCore,
          },
          { "border border-dashed border-slate-700/50": schema.isCore },
        )}
      >
        {isField(schema) && <SettingsFormField schema={schema} path={path} />}
        <SchemaItemControls
          attributes={attributes}
          listeners={listeners}
          onEdit={() => onEdit(path)}
          onDelete={() => onDelete(path)}
          isCore={!!schema.isCore}
        />
      </div>
    </div>
  );
});
