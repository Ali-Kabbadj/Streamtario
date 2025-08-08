import type { SettingsSchema, ObjectSchema, ArraySchema } from "../schemas/settings-schema";
import type { WritableDraft } from "immer";

export const findNodeAndParent = (
    path: string[],
    rootItems: WritableDraft<SettingsSchema>[]
): {
    parent: WritableDraft<ObjectSchema | ArraySchema> | null;
    items: WritableDraft<SettingsSchema>[];
    node: WritableDraft<SettingsSchema>;
    index: number;
} | null => {
    let items: WritableDraft<SettingsSchema>[] = rootItems;
    let parent: WritableDraft<ObjectSchema | ArraySchema> | null = null;

    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (!segment) return null;

        const currentItem = items.find((s) => s.name === segment);
        if (!currentItem || (currentItem.type !== "object" && currentItem.type !== "array")) {
            return null;
        }
        parent = currentItem;
        items = currentItem.type === "object" ? currentItem.fields : currentItem.itemSchema.fields;
    }

    const finalSegment = path[path.length - 1];
    if (!finalSegment) return null;

    const index = items.findIndex((s) => s.name === finalSegment);
    const node = items[index];

    return node ? { parent, items, node, index } : null;
};

export const findSchemaItem = (path: string[], schema: readonly SettingsSchema[]): SettingsSchema | null => {
    let items: readonly SettingsSchema[] | undefined = schema;
    let node: SettingsSchema | null = null;
    for (const segment of path) {
        if (!items) return null;
        const foundItem: SettingsSchema | undefined = items.find(i => i.name === segment);
        if (!foundItem) return null;
        node = foundItem;
        items = (node.type === 'object') ? node.fields : undefined;
    }
    return node;
}


export const getFlattenedIds = (schema: SettingsSchema[], parentPath = ""): string[] => {
    let ids: string[] = [];
    for (const item of schema) {
        const currentPath = parentPath ? `${parentPath}.${item.name}` : item.name;
        ids.push(currentPath);
        if (item.type === 'object') {
            ids = [...ids, ...getFlattenedIds(item.fields, currentPath)];
        }
    }
    return ids;
}