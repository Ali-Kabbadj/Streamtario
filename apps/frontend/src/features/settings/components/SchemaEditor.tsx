"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
import type { SettingsSchema, ObjectSchema } from "../schemas/settings-schema";
import { SortableSchemaItem } from "./SortableSchemaItem";
import { SchemaItem } from "./SchemaItem";
import {
  findNodeAndParent,
  getFlattenedIds,
  findSchemaItem,
} from "../utils/schema-utils";
import { DropIndicator } from "./DropIndicator";

interface SchemaEditorProps {
  schema: SettingsSchema[];
  onSchemaChange: (schema: SettingsSchema[]) => void;
  onEdit: (path: string) => void;
  onDelete: (path: string) => void;
  onAddChild: (path: string) => void;
}

export const SchemaEditor = ({
  schema,
  onSchemaChange,
  onEdit,
  onDelete,
  onAddChild,
}: SchemaEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOverId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overId = over ? String(over.id) : null;
      setOverId(overId);

      if (!over || !active) {
        setIsValidDrop(false);
        return;
      }

      const activeItem = findSchemaItem(String(active.id).split("."), schema);
      const overItem = findSchemaItem(String(over.id).split("."), schema);

      if (!activeItem || !overItem || activeItem.isCore) {
        setIsValidDrop(false);
        return;
      }

      const overIsContainer =
        overItem.type === "object" || overItem.type === "array";
      if (overIsContainer && overItem.isCore) {
        setIsValidDrop(false);
        return;
      }

      setIsValidDrop(true);
    },
    [schema],
  );

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setOverId(null);

      const { active, over } = event;
      if (over && active.id !== over.id) {
        const newSchema = produce(schema, (draft) => {
          const activePath = String(active.id).split(".");
          const overPath = String(over.id).split(".");

          const activeNodeInfo = findNodeAndParent(activePath, draft);
          if (!activeNodeInfo || activeNodeInfo.node.isCore) return;

          const [movedItem] = activeNodeInfo.items.splice(
            activeNodeInfo.index,
            1,
          );
          if (!movedItem) return;

          const overNodeInfo = findNodeAndParent(overPath, draft);
          if (overNodeInfo && !overNodeInfo.node.isCore) {
            overNodeInfo.items.splice(overNodeInfo.index, 0, movedItem);
          } else {
            if (over.id === "root-drop-zone") {
              draft.push(movedItem);
            } else {
              activeNodeInfo.items.splice(activeNodeInfo.index, 0, movedItem);
            }
          }
        });
        onSchemaChange(newSchema);
      }
    },
    [schema, onSchemaChange],
  );

  const activeSchemaItem = activeId
    ? findSchemaItem(activeId.split("."), schema)
    : null;

  const renderNestedSchema = (
    items: SettingsSchema[],
    path: string,
  ): React.ReactNode[] => {
    return items.map((item) => {
      const id = path ? `${path}.${item.name}` : item.name;
      return (
        <SortableSchemaItem
          key={id}
          id={id}
          schema={item}
          path={id}
          isOver={overId === id}
          isDragging={activeId === id}
          isValidDrop={isValidDrop}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          renderNested={renderNestedSchema}
        />
      );
    });
  };

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
        items={getFlattenedIds(schema)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">{renderNestedSchema(schema, "")}</div>
      </SortableContext>
      <div
        id="root-drop-zone"
        className="mt-4 flex min-h-[5rem] items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/30 text-slate-500 transition-colors"
      >
        Drag here to move to the root
      </div>
      <DragOverlay>
        {activeSchemaItem ? <SchemaItem schema={activeSchemaItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
