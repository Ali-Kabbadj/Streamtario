// components/SettingsSection.tsx
"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { SettingsSchema, ArraySchema } from "../schemas/settings-schema";
import { SettingsField } from "./SettingsField";
import { DynamicArraySection } from "./DynamicArraySection";

interface SettingsSectionProps {
  schema: SettingsSchema;
  pathPrefix: string;
  onEditListItem: (
    path: string,
    itemSchema: ArraySchema["itemSchema"],
    itemIndex?: number,
  ) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  schema,
  pathPrefix,
  onEditListItem,
}) => {
  if (schema.type !== "object") return null;

  const currentPath = pathPrefix ? `${pathPrefix}.${schema.name}` : schema.name;

  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardHeader>
        <CardTitle>{schema.label}</CardTitle>
        {schema.description && (
          <CardDescription>{schema.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {schema.fields.map((fieldSchema) => {
          const fieldPath = `${currentPath}.${fieldSchema.name}`;

          if (fieldSchema.type === "array") {
            // Render DynamicArraySection for lists
            return (
              <DynamicArraySection
                key={fieldPath}
                path={fieldPath}
                schema={fieldSchema}
                onEditItem={(index) =>
                  onEditListItem(fieldPath, fieldSchema.itemSchema, index)
                }
                onAddItem={() =>
                  onEditListItem(fieldPath, fieldSchema.itemSchema)
                }
              />
            );
          }

          // Use a type guard to ensure it's a primitive FieldSchema
          if (
            fieldSchema.type === "string" ||
            fieldSchema.type === "number" ||
            fieldSchema.type === "boolean"
          ) {
            return (
              <SettingsField
                key={fieldPath}
                path={fieldPath}
                schema={fieldSchema}
              />
            );
          }

          // Should not happen with current schema, but handle potential nested objects
          if (fieldSchema.type === "object") {
            // If you need nested objects in static view, you'd recursively call SettingsSection here.
            // For now, we assume SettingsSection only handles the top level objects and their fields.
            return null;
          }

          return null;
        })}
      </CardContent>
    </Card>
  );
};
