// components/TopRightControls.tsx
"use client";

import React from "react";
import { Edit3, Trash2, GripVertical, Plus } from "lucide-react";

interface Props {
  onEdit: () => void;
  onDelete: () => void;
  onAddChild?: () => void;
  dragListeners?: Record<string, unknown>;
  isCore?: boolean;
}

/**
 * Compact top-right control cluster — small icons, attached to top-right of card.
 * Use inside the card header and absolutely positioned to the top-right corner.
 */
export const TopRightControls: React.FC<Props> = ({
  onEdit,
  onDelete,
  onAddChild,
  dragListeners,
  isCore,
}) => {
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90">
      {!isCore && (
        <button
          {...(dragListeners ?? {})}
          aria-label="drag-handle"
          className="rounded p-1 hover:bg-slate-800/60"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={onEdit}
        aria-label="edit"
        className="rounded p-1 hover:bg-slate-800/60"
      >
        <Edit3 className="h-4 w-4" />
      </button>
      {!isCore && (
        <button
          onClick={onDelete}
          aria-label="delete"
          className="rounded p-1 text-red-400 hover:bg-red-700/30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {onAddChild && (
        <button
          onClick={onAddChild}
          aria-label="add"
          className="rounded p-1 hover:bg-slate-800/60"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
