/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SettingsSchema, ObjectSchema } from "../schemas/settings-schema";
import type { WritableDraft } from "immer";

export const findNodeAndParent = (
    path: string[],
    rootItems: SettingsSchema[] | WritableDraft<SettingsSchema>[]
) => {
    if (!path || path.length === 0) return null;
    let items: (SettingsSchema | WritableDraft<SettingsSchema>)[] = rootItems;
    let parent: ObjectSchema | null = null;
    for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        if (!segment) return null;
        const idx = items.findIndex((it) => it.name === segment);
        if (idx === -1) return null;
        const node = items[idx];
        if (i === path.length - 1) {
            return { node, parent, items, index: idx };
        }
        if (!node || node.type !== "object") return null;
        parent = node as ObjectSchema;
        items = (node as ObjectSchema).fields;
    }
    return null;
};

export const findSchemaItem = (
    path: string[],
    schema: readonly SettingsSchema[],
): SettingsSchema | null => {
    if (!path || path.length === 0) return null;
    let currentLevel: readonly SettingsSchema[] | undefined = schema;
    let found: SettingsSchema | null = null;
    for (const segment of path) {
        if (!currentLevel) return null;
        const item: SettingsSchema | undefined = currentLevel.find((i) => i.name === segment);
        if (!item) return null;
        found = item;
        currentLevel = item.type === "object" ? item.fields : undefined;
    }
    return found;
};

export const getDefaultValueForSchema = (s: SettingsSchema): unknown => {
    if (s.type === "object") {
        const obj: Record<string, unknown> = {};
        for (const f of s.fields) obj[f.name] = getDefaultValueForSchema(f);
        return obj;
    }
    if (s.type === "array") return s.defaultValue ?? [];
    return "defaultValue" in s ? s.defaultValue : null;
};

export const getValueByPath = (obj: Record<string, any>, path: string): unknown => {
    const parts = path.split('.');
    let current: any = obj;
    for (const part of parts) {
        if (!part) continue;
        if (current === null || typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
};

export const setValueByPath = (obj: Record<string, any>, path: string, value: unknown): void => {
    const parts = path.split('.');
    let current: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part) continue;
        if (current[part] === undefined || typeof current[part] !== 'object' || current[part] === null) {
            current[part] = {};
        }
        current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
        current[lastPart] = value;
    }
};

export const deleteValueByPath = (obj: Record<string, any>, path: string): void => {
    const parts = path.split('.');
    let current: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!part) continue;
        if (current === null || typeof current !== 'object' || !(part in current)) {
            return;
        }
        current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart && current && typeof current === 'object') {
        delete current[lastPart];
    }
};