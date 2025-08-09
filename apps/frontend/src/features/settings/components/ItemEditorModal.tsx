// components/ItemEditorModal.tsx
"use client";

import { useEffect } from "react";
import { useForm, type FieldValues } from "react-hook-form";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ArraySchema } from "../schemas/settings-schema";

interface ItemEditorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Record<string, unknown>) => void;
  itemSchema: ArraySchema["itemSchema"];
  initialData?: Record<string, unknown> | null;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  onOpenChange,
  onSave,
  itemSchema,
  initialData,
}) => {
  const isEditing = !!initialData;

  const generateDefaults = (schema: ArraySchema["itemSchema"]) => {
    const defaults: Record<string, unknown> = {};
    schema.fields.forEach((field) => {
      defaults[field.name] = field.defaultValue;
    });
    return defaults;
  };

  const defaultValues: FieldValues =
    initialData ?? generateDefaults(itemSchema);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, reset, defaultValues]);

  const handleFormSubmit = (data: FieldValues) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-1">
          <form
            id="item-editor-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4 p-4"
          >
            {itemSchema.fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  {...register(field.name, {
                    required: `${field.label} is required`,
                  })}
                  placeholder={field.description}
                  className="mt-1"
                />
                {errors[field.name] && (
                  <p className="pt-1 text-sm text-red-500">
                    {errors[field.name]?.message as string}
                  </p>
                )}
              </div>
            ))}
          </form>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit" form="item-editor-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
