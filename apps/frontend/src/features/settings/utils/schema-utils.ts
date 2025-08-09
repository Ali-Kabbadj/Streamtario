import type { SettingsSchema, ObjectSchema } from "../schemas/settings-schema";
import type { WritableDraft } from "immer";

export const findNodeAndParent = (
    path: string[],
    rootItems: SettingsSchema[] | WritableDraft<SettingsSchema>[]
) => {
    // FIX: Explicitly type `items` to avoid inference issues in the loop
    let items: typeof rootItems = rootItems;
    let parent: (ObjectSchema | WritableDraft<ObjectSchema>) | null = null;

    for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        if (!segment) return null;

        const foundIndex = items.findIndex((s) => s.name === segment);
        if (foundIndex === -1) return null;

        const node = items[foundIndex];
        if (!node) return null;

        if (i === path.length - 1) {
            return { parent, items, node, index: foundIndex };
        }

        if (node.type !== 'object') {
            return null; // Path continues, but current item is not a container
        }

        parent = node;
        items = node.fields;
    }
    return null;
};


export const findSchemaItem = (path: string[], schema: readonly SettingsSchema[]): SettingsSchema | null => {
    let currentLevel: readonly SettingsSchema[] | undefined = schema;
    let foundNode: SettingsSchema | null = null;

    for (const segment of path) {
        if (!currentLevel) return null;
        // FIX: Removed non-null assertion '!' for safer code
        const item = currentLevel.find(i => i.name === segment);
        if (!item) return null;

        foundNode = item;
        currentLevel = item.type === 'object' ? item.fields : undefined;
    }

    return foundNode;
}

export const getFlattenedIds = (schema: SettingsSchema[], parentPath = "", maxDepth = Infinity, currentDepth = 1): string[] => {
    let ids: string[] = [];
    if (currentDepth > maxDepth) return ids;

    for (const item of schema) {
        const currentPath = parentPath ? `${parentPath}.${item.name}` : item.name;
        ids.push(currentPath);
        if (item.type === 'object') {
            ids = [...ids, ...getFlattenedIds(item.fields, currentPath, maxDepth, currentDepth + 1)];
        }
    }
    return ids;
}

export const getDefaultValueForSchema = (schema: SettingsSchema): unknown => {
    if ('defaultValue' in schema && typeof schema.defaultValue !== 'undefined') {
        return schema.defaultValue;
    }
    if (schema.type === 'object') {
        return schema.fields.reduce((acc: Record<string, unknown>, field) => {
            acc[field.name] = getDefaultValueForSchema(field);
            return acc;
        }, {});
    }
    // FIX: Ensure arrays get a default value from their schema if it exists.
    if (schema.type === 'array') {
        return schema.defaultValue ?? [];
    }
    return undefined;
};