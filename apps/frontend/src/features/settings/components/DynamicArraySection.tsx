// components/DynamicArraySection.tsx
"use client";

import React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { ArraySchema } from "../schemas/settings-schema";

interface DynamicArraySectionProps {
  path: string;
  schema: ArraySchema;
  onEditItem: (index: number) => void;
  onAddItem: () => void;
}

export const DynamicArraySection: React.FC<DynamicArraySectionProps> = ({
  path,
  schema,
  onEditItem,
  onAddItem,
}) => {
  const { control } = useFormContext();
  // useFieldArray is now correctly initialized here for the remove action
  const { fields, remove } = useFieldArray({
    control,
    name: path,
  });

  const primaryField = schema.itemSchema.fields[0]?.name ?? "name";
  const secondaryField = schema.itemSchema.fields[1]?.name ?? "command";

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-lg">{schema.label}</CardTitle>
        {schema.description && (
          <CardDescription>{schema.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-slate-400">
            No {schema.itemLabel.toLowerCase()}s added yet.
          </p>
        )}
        <div className="space-y-2">
          {fields.map((item, index) => {
            const typedItem = item as Record<string, unknown>;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-slate-600 bg-slate-900/50 p-3"
              >
                <div>
                  <p className="font-medium">
                    {String(typedItem[primaryField])}
                  </p>
                  <p className="max-w-md truncate text-sm text-slate-400">
                    {String(typedItem[secondaryField])}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditItem(index)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-400"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add {schema.itemLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
