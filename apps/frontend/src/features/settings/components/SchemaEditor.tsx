"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { produce } from "immer";
import type { SettingsSchema } from "../schemas/settings-schema";
import { SortableSchemaItem } from "./SortableSchemaItem";
import { SchemaItem } from "./SchemaItem";
import {
  findNodeAndParent,
  getFlattenedIds,
  findSchemaItem,
} from "../utils/schema-utils";
import { DropIndicator } from "./DropIndicator";

export type DropPosition = "top" | "bottom" | "nest" | null;

interface SchemaEditorProps {
  schema: SettingsSchema[];
  onSchemaChange: (schema: SettingsSchema[]) => void;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
}

export const SchemaEditor = React.memo(function SchemaEditor({
  schema,
  onSchemaChange,
  onEdit,
  onDelete,
  onAddChild,
}: SchemaEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flattenedRootIds = useMemo(
    () => getFlattenedIds(schema, "", 1),
    [schema],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      const currentOverId = over?.id ? String(over.id) : null;
      setOverId(currentOverId);

      if (!currentOverId || !active.id || !over?.rect) {
        setDropPosition(null);
        return;
      }

      const isBelow = event.delta.y > 0;
      let position: DropPosition = isBelow ? "bottom" : "top";

      const overNode = findSchemaItem(currentOverId.split("."), schema);
      if (overNode?.type === "object") {
        if (event.delta.x > 24) {
          position = "nest";
        }
      }

      setDropPosition(position);
    },
    [schema],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);
      setDropPosition(null);

      if (!over || !dropPosition || active.id === over.id) return;

      const activePath = String(active.id).split(".");
      const overPath = String(over.id).split(".");

      const activeNodeInfo = findNodeAndParent(activePath, schema);
      // Rule: Cannot move a core item itself. This is our primary guard.
      if (!activeNodeInfo || activeNodeInfo.node.isCore) return;

      const overNodeInfo = findNodeAndParent(overPath, schema);
      if (!overNodeInfo) return;

      // --- REFINED VALIDATION LOGIC ---
      if (dropPosition === "nest") {
        const destinationContainer = overNodeInfo.node;
        if (destinationContainer.type !== "object") return; // Can only nest in objects

        // Rule: If destination is a core container, it must explicitly accept the item.
        // This rule is fine and should remain.
        if (
          destinationContainer.isCore &&
          !destinationContainer.accepts?.includes(activeNodeInfo.node.name)
        ) {
          return; // Not accepted
        }
      }
      // FIX: The overly-strict rule that trapped custom items has been REMOVED.
      // A non-core item is now always free to be re-parented. The `activeNodeInfo.node.isCore`
      // check at the top is sufficient to lock actual core items in place.
      // --- END VALIDATION LOGIC ---

      const newSchema = produce(schema, (draft) => {
        const activeDraftInfo = findNodeAndParent(activePath, draft);
        if (!activeDraftInfo) return;

        const [movedItem] = activeDraftInfo.items.splice(
          activeDraftInfo.index,
          1,
        );
        if (!movedItem) return;

        const overDraftInfo = findNodeAndParent(overPath, draft);
        if (!overDraftInfo) return;

        if (dropPosition === "nest" && overDraftInfo.node.type === "object") {
          overDraftInfo.node.fields.push(movedItem);
        } else {
          const dropIndex =
            overDraftInfo.index + (dropPosition === "bottom" ? 1 : 0);
          overDraftInfo.items.splice(dropIndex, 0, movedItem);
        }
      });

      onSchemaChange(newSchema);
    },
    [schema, onSchemaChange, dropPosition],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropPosition(null);
  }, []);

  const activeSchemaItem = activeId
    ? findSchemaItem(activeId.split("."), schema)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={flattenedRootIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {schema.map((item) => (
            <SortableSchemaItem
              key={item.name}
              id={item.name}
              schema={item}
              path={item.name}
              // FIX: Pass down the necessary props for the new indicator
              isOver={overId === item.name}
              dropPosition={overId === item.name ? dropPosition : null}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeSchemaItem ? <SchemaItem schema={activeSchemaItem} /> : null}
      </DragOverlay>
      {activeId && overId && (
        <DropIndicator
          isOver={!!overId}
          position={dropPosition}
          overId={overId}
        />
      )}
    </DndContext>
  );
});
