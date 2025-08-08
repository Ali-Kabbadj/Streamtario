"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SettingsSchema,
  FieldSchema,
  ObjectSchema,
  ArraySchema,
} from "../schemas/settings-schema";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";

interface SchemaFieldEditorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (schema: SettingsSchema) => void;
  initialSchema?: SettingsSchema | null;
}

type SchemaFormValues = {
  name: string;
  label: string;
  description?: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue?: string | number | boolean;
  options?: { value: string; label: string }[];
};

export const SchemaFieldEditorModal = ({
  isOpen,
  onOpenChange,
  onSave,
  initialSchema,
}: SchemaFieldEditorModalProps) => {
  const isEditing = !!initialSchema;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SchemaFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (isOpen && initialSchema) {
      const fieldSchema = initialSchema as FieldSchema;
      const formValues: SchemaFormValues = {
        name: initialSchema.name,
        label: initialSchema.label,
        description: initialSchema.description,
        type: initialSchema.type,
        defaultValue:
          "defaultValue" in fieldSchema ? fieldSchema.defaultValue : undefined,
        options:
          "options" in fieldSchema && fieldSchema.options
            ? fieldSchema.options.map((opt) => ({
                ...opt,
                value: String(opt.value),
              }))
            : [],
      };
      reset(formValues);
    } else if (!isOpen) {
      reset({
        name: "",
        label: "",
        description: "",
        type: "string",
        defaultValue: "",
        options: [],
      });
    }
  }, [isOpen, initialSchema, reset]);

  const handleFormSubmit = (data: SchemaFormValues) => {
    const baseSchema = {
      name: data.name,
      label: data.label,
      description: data.description,
      isCore: initialSchema?.isCore ?? false, // Preserve core status
    };

    let finalSchema: SettingsSchema;

    switch (data.type) {
      case "object":
        finalSchema = {
          ...baseSchema,
          type: "object",
          fields: (initialSchema as ObjectSchema)?.fields ?? [],
        };
        break;
      case "array":
        finalSchema = {
          ...baseSchema,
          type: "array",
          itemLabel: (initialSchema as ArraySchema)?.itemLabel ?? "Item",
          itemSchema: (initialSchema as ArraySchema)?.itemSchema ?? {
            type: "object",
            fields: [],
          },
        };
        break;
      default: {
        let defaultValue: string | number | boolean = data.defaultValue ?? "";
        if (data.type === "number" && typeof defaultValue === "string") {
          defaultValue = Number(defaultValue) || 0;
        } else if (data.type === "boolean") {
          defaultValue = !!defaultValue;
        }

        const field: FieldSchema = {
          ...baseSchema,
          type: data.type,
          defaultValue: defaultValue as never,
        };

        if (data.options && data.options.length > 0) {
          if (field.type === "string" || field.type === "number") {
            field.options =
              data.type === "number"
                ? data.options.map((opt) => ({
                    ...opt,
                    value: Number(opt.value),
                  }))
                : data.options;
          }
        }
        finalSchema = field;
        break;
      }
    }

    onSave(finalSchema);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Field Schema" : "Add New Field"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <form
            id="schema-editor-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4 p-4"
          >
            <div>
              <Label htmlFor="type">Field Type</Label>
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing && initialSchema?.isCore}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Text / Dropdown</SelectItem>
                      <SelectItem value="number">Number / Dropdown</SelectItem>
                      <SelectItem value="boolean">Switch (On/Off)</SelectItem>
                      <SelectItem value="object">Object (Container)</SelectItem>
                      <SelectItem value="array">List of Objects</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label htmlFor="name">Field Key (ID)</Label>
              <Input
                id="name"
                {...register("name", { required: "Key is required" })}
                placeholder="e.g., cacheSizeGb"
                disabled={isEditing && initialSchema?.isCore}
              />
              {errors.name && (
                <p className="pt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="label">Display Label</Label>
              <Input
                id="label"
                {...register("label", { required: "Label is required" })}
                placeholder="e.g., Cache Size (GB)"
              />
              {errors.label && (
                <p className="pt-1 text-sm text-red-500">
                  {errors.label.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="Help text shown below the label"
              />
            </div>

            {selectedType &&
              ["string", "number", "boolean"].includes(selectedType) && (
                <div>
                  <Label htmlFor="defaultValue">Default Value</Label>
                  {selectedType === "boolean" ? (
                    <Controller
                      name="defaultValue"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          className="mt-2 block"
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  ) : (
                    <Input
                      id="defaultValue"
                      type={selectedType === "number" ? "number" : "text"}
                      {...register("defaultValue", {
                        valueAsNumber: selectedType === "number",
                      })}
                    />
                  )}
                </div>
              )}

            {(selectedType === "string" || selectedType === "number") && (
              <div className="space-y-2 rounded-md border p-4">
                <Label>Dropdown Options</Label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...register(`options.${index}.label`)}
                      placeholder="Label"
                    />
                    <Input
                      {...register(`options.${index}.value`)}
                      placeholder="Value"
                      type={selectedType === "number" ? "number" : "text"}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ label: "", value: "" })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                </Button>
              </div>
            )}
          </form>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="schema-editor-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
