"use client";

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
import { useFormContext, Controller } from "react-hook-form";
import type { FieldSchema } from "../schemas/settings-schema";
import type { FieldErrors } from "react-hook-form";

interface FormFieldProps {
  schema: FieldSchema;
  path: string;
}

export const SettingsFormField = ({ schema, path }: FormFieldProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const getError = (p: string) => {
    const parts = p.split(".");
    let current: FieldErrors | undefined = errors;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part] as FieldErrors;
      } else {
        return undefined;
      }
    }
    return current?.message as string | undefined;
  };

  const error = getError(path);
  const { type, label, description } = schema;

  const renderInput = () => {
    switch (type) {
      case "boolean":
        return (
          <Controller
            name={path}
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                id={path}
              />
            )}
          />
        );
      case "number":
      case "string":
        if ("options" in schema && schema.options) {
          return (
            <Controller
              name={path}
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => {
                    const finalValue =
                      type === "number" ? Number(value) : value;
                    field.onChange(finalValue);
                  }}
                >
                  <SelectTrigger id={path}>
                    <SelectValue placeholder={`Select ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {schema.options?.map((option) => (
                      <SelectItem
                        key={String(option.value)}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          );
        }
        return (
          <Input
            type={type}
            id={path}
            {...register(path, {
              valueAsNumber: type === "number",
            })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor={path} className="text-base font-medium">
          {label}
        </Label>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
      <div className="flex items-start">
        <div className="w-full">
          {renderInput()}
          {error && <p className="pt-1 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
};
