"use client";

import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import type {
  DraggableSyntheticListeners,
  DraggableAttributes,
} from "@dnd-kit/core";

interface SchemaItemControlsProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isCore: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
}

export const SchemaItemControls = ({
  attributes,
  listeners,
  isCore,
  onEdit,
  onDelete,
  onAddChild,
}: SchemaItemControlsProps) => {
  return (
    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center rounded-full border border-slate-600 bg-slate-800/80 p-1 opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
      {onAddChild && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddChild}
          className="h-7 w-7"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7">
        <Pencil className="h-4 w-4" />
      </Button>
      {!isCore && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-7 w-7 text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {!isCore && (
        <button
          {...attributes}
          {...listeners}
          className="h-7 w-7 cursor-grab touch-none p-1"
        >
          <GripVertical className="h-full w-full text-slate-400" />
        </button>
      )}
    </div>
  );
};
