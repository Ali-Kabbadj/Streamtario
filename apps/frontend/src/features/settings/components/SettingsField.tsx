// components/SettingsField.tsx
"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldSchema } from "../schemas/settings-schema";
import { FileField } from "./FileField";

interface SettingsFieldProps {
  path: string;
  schema: FieldSchema;
}

export const SettingsField: React.FC<SettingsFieldProps> = ({
  path,
  schema,
}) => {
  const { register, control } = useFormContext();
  const { type, label, description } = schema;

  if ("options" in schema && schema.options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={path} className="font-medium">
          {label}
        </Label>
        <Controller
          name={path}
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) =>
                field.onChange(type === "number" ? Number(value) : value)
              }
            >
              <SelectTrigger id={path}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schema.options?.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
    );
  }

  switch (type) {
    case "file":
      return <FileField path={path} schema={schema} />;

    case "boolean":
      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
          <div>
            <Label htmlFor={path} className="font-medium">
              {label}
            </Label>
            {description && (
              <p className="text-sm text-slate-400">{description}</p>
            )}
          </div>
          <Controller
            name={path}
            control={control}
            render={({ field }) => (
              <Switch
                id={path}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      );

    case "string":
    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={path} className="font-medium">
            {label}
          </Label>
          <Input
            id={path}
            type={type}
            {...register(path, { valueAsNumber: type === "number" })}
            className="bg-slate-800"
          />
          {description && (
            <p className="text-sm text-slate-400">{description}</p>
          )}
        </div>
      );

    default:
      return null;
  }
};
