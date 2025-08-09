// components/SchemaEditor.tsx
"use client";

import React, { useCallback, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { produce } from "immer";
import type { ObjectSchema, SettingsSchema } from "../schemas/settings-schema";
import { SortableSchemaItem } from "./SortableSchemaItem";
import { SchemaItem } from "./SchemaItem";
import {
  findNodeAndParent,
  findSchemaItem,
} from "../utils/schema-utils";
import { DropIndicator } from "./DropIndicator";
import { usePointerPosition } from "../hooks/usePointerPosition";
import { getDropTargetFromPoint } from "../utils/drop-manager";

export type DropPosition = "top" | "bottom" | "nest" | null;

interface Props {
  schema: SettingsSchema[];
  onSchemaChange: (s: SettingsSchema[]) => void;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
}

export const SchemaEditor: React.FC<Props> = React.memo(function SchemaEditor({
  schema,
  onSchemaChange,
  onEdit,
  onDelete,
  onAddChild,
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  const pointerRef = usePointerPosition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setIsAllowed(null);
  }, []);

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      const active = e.active;
      // prefer pointer coordinates from event if present, else from global pointerRef
      const pointer = "pointer" in e ? (e.pointer as PointerEvent) : null;
      const last = pointerRef.current;
      const x =
        pointer && typeof pointer.clientX === "number"
          ? pointer.clientX
          : (last?.x ?? window.innerWidth / 2);
      const y =
        pointer && typeof pointer.clientY === "number"
          ? pointer.clientY
          : (last?.y ?? window.innerHeight / 2);

      const result = getDropTargetFromPoint({
        x,
        y,
        draggedId: active?.id ? String(active.id) : undefined,
      });

      setOverId(result.overId);
      setDropPosition(result.position);

      // validate with schema rules
      if (!result.overId || !active?.id) {
        setIsAllowed(null);
        return;
      }

      const activePath = String(active.id).split(".");
      const overPath = String(result.overId).split(".");
      const activeInfo = findNodeAndParent(activePath, schema);
      const overInfo = findNodeAndParent(overPath, schema);

      if (!activeInfo || !overInfo) {
        setIsAllowed(false);
        return;
      }

      // cannot move core nodes
      if (activeInfo.node?.isCore) {
        setIsAllowed(false);
        return;
      }

      // nest requires object and if target is core, must be extensible
      if (result.position === "nest") {
        if (overInfo.node?.type !== "object") {
          setIsAllowed(false);
          return;
        }
        if (
          overInfo.node.isCore &&
          "isExtensible" in overInfo.node &&
          !overInfo.node.isExtensible
        ) {
          setIsAllowed(false);
          return;
        }
      }

      setIsAllowed(true);
    },
    [pointerRef, schema],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const active = e.active;
      const finalPos = dropPosition;
      const allowed = isAllowed;

      setActiveId(null);
      setOverId(null);
      setDropPosition(null);
      setIsAllowed(null);

      if (!e.over || !finalPos || active.id === e.over.id) return;
      if (!allowed) return;

      const activePath = String(active.id).split(".");
      const overPath = String(e.over.id).split(".");

      const newSchema = produce(schema, (draft) => {
        const src = findNodeAndParent(activePath, draft);
        if (!src) return;
        const [moved] = src.items.splice(src.index, 1);
        if (!moved) return;

        const dest = findNodeAndParent(overPath, draft);
        if (!dest) return;

        if (finalPos === "nest" && dest.node?.type === "object") {
          (dest.node as ObjectSchema).fields.push(moved);
        } else {
          const insertIndex = dest.index + (finalPos === "bottom" ? 1 : 0);
          dest.items.splice(insertIndex, 0, moved);
        }
      });

      onSchemaChange(newSchema);
    },
    [schema, dropPosition, isAllowed, onSchemaChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropPosition(null);
    setIsAllowed(null);
  }, []);

  const activeSchemaItem = activeId
    ? findSchemaItem(activeId.split("."), schema)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-3">
        {schema.map((it) => (
          <SortableSchemaItem
            key={it.name}
            id={it.name}
            schema={it}
            path={it.name}
            isOver={overId === it.name}
            dropPosition={overId === it.name ? dropPosition : null}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
      </div>

      <DragOverlay>
        {activeSchemaItem ? <SchemaItem schema={activeSchemaItem} /> : null}
      </DragOverlay>

      {overId && dropPosition && (
        <DropIndicator
          isOver={!!overId}
          position={dropPosition}
          overId={overId}
          color={isAllowed === false ? "#ef4444" : undefined}
        />
      )}
    </DndContext>
  );
});
