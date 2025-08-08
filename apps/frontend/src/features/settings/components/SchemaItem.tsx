"use client";

import type { SettingsSchema } from "../schemas/settings-schema";
import { SettingsFormField } from "./SettingsFormField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SchemaItemProps {
  schema: SettingsSchema;
}

// A non-sortable version of the component for the DragOverlay
export const SchemaItem = ({ schema }: SchemaItemProps) => {
  const isContainer = schema.type === "object" || schema.type === "array";

  return (
    <div className="group/item relative">
      {isContainer ? (
        <Card
          className={cn("border-slate-700 bg-slate-900/50", {
            "border-dashed": schema.isCore,
          })}
        >
          <CardHeader>
            <CardTitle>{schema.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pl-10">
            {/* Overlay doesn't render children */}
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "relative rounded-lg border border-transparent bg-slate-800 p-3",
            { "border-dashed border-slate-700": schema.isCore },
          )}
        >
          <SettingsFormField schema={schema} path={schema.name} />
        </div>
      )}
    </div>
  );
};
