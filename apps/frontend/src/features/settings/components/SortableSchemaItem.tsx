"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SettingsSchema } from "../schemas/settings-schema";
import { SchemaItemControls } from "./SchemaItemControls";
import { SettingsFormField } from "./SettingsFormField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DropIndicator } from "./DropIndicator";

interface SortableSchemaItemProps {
  id: string;
  schema: SettingsSchema;
  path: string;
  isOver: boolean;
  isDragging: boolean;
  isValidDrop: boolean;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
  renderNested: (schema: SettingsSchema[], path: string) => React.ReactNode;
}

export const SortableSchemaItem = React.memo(function SortableSchemaItem({
  id,
  schema,
  path,
  isOver,
  isDragging,
  isValidDrop,
  onEdit,
  onDelete,
  onAddChild,
  renderNested,
}: SortableSchemaItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id,
      data: {
        path,
        schema,
        isContainer: schema.type === "object" || schema.type === "array",
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const isContainer = schema.type === "object" || schema.type === "array";

  return (
    <div ref={setNodeRef} style={style} className="group/item relative">
      <DropIndicator isOver={isOver && !isContainer} isContainer={false} />
      {isContainer ? (
        <Card
          className={cn("border-slate-700 bg-slate-900/50 transition-all", {
            "border-dashed": schema.isCore,
            "ring-2": isOver && !isDragging,
            "ring-blue-500": isOver && !isDragging && isValidDrop,
            "ring-red-500": isOver && !isDragging && !isValidDrop,
          })}
        >
          <CardHeader className="relative">
            <CardTitle>{schema.label}</CardTitle>
            <SchemaItemControls
              attributes={attributes}
              listeners={listeners}
              onEdit={() => onEdit(path)}
              onDelete={() => onDelete(path)}
              onAddChild={() => onAddChild(path)}
              isCore={!!schema.isCore}
            />
          </CardHeader>
          <CardContent className="space-y-4 pt-4 pl-6">
            {schema.type === "object" && renderNested(schema.fields, path)}
            {schema.type === "array" && (
              <div>Array rendering to be implemented</div>
            )}
          </CardContent>
          <DropIndicator isOver={isOver} isContainer={true} />
        </Card>
      ) : (
        <div
          className={cn(
            "relative rounded-lg border border-transparent p-3 transition-colors hover:border-slate-700 hover:bg-slate-800/50",
            { "border-dashed border-slate-700": schema.isCore },
          )}
        >
          <SettingsFormField schema={schema} path={path} />
          <SchemaItemControls
            attributes={attributes}
            listeners={listeners}
            onEdit={() => onEdit(path)}
            onDelete={() => onDelete(path)}
            isCore={!!schema.isCore}
          />
        </div>
      )}
    </div>
  );
});
