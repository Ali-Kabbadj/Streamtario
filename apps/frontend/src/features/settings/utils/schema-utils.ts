// utils/schema-utils.ts
import type { SettingsSchema, ObjectSchema } from "../schemas/settings-schema";
import type { WritableDraft } from "immer";

/**
 * findNodeAndParent
 * - path: segments array (["mpv","customCommands"] etc)
 * - rootItems: schema array or draft (immer)
 * returns { node, parent, items, index } or null if not found
 */
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

        // continue traversing only if object
        if (!node || node.type !== "object") return null;

        parent = node as ObjectSchema;
        items = (node as ObjectSchema).fields;
    }

    return null;
};

/**
 * findSchemaItem: find item by path on read-only schema
 */
export const findSchemaItem = (
  path: string[],
  schema: readonly SettingsSchema[],
): SettingsSchema | null => {
  if (!path || path.length === 0) return null;
  let currentLevel: readonly SettingsSchema[] | undefined = schema;
  let found: SettingsSchema | null = null;

  for (const segment of path) {
    if (!currentLevel) return null;
    const item: SettingsSchema | undefined = currentLevel.find(
      (i) => i.name === segment,
    );
    if (!item) return null;
    found = item;
    currentLevel = item.type === "object" ? item.fields : undefined;
  }
  return found;
};

/**
 * getFlattenedIds: returns list of dotted ids for sortable context
 */
export const getFlattenedIds = (
    schema: SettingsSchema[],
    parentPath = ""
): string[] => {
    const out: string[] = [];
    const walk = (items: SettingsSchema[], prefix = "") => {
        for (const it of items) {
            const id = prefix ? `${prefix}.${it.name}` : it.name;
            out.push(id);
            if (it.type === "object") {
                walk(it.fields, id);
            }
        }
    };
    walk(schema, parentPath);
    return out;
};

/**
 * getDefaultValueForSchema: returns JS default for a schema node
 */
export const getDefaultValueForSchema = (s: SettingsSchema): unknown => {
    if (s.type === "object") {
        const obj: Record<string, unknown> = {};
        for (const f of s.fields) obj[f.name] = getDefaultValueForSchema(f);
        return obj;
    }
    if (s.type === "array") return s.defaultValue ?? [];
    return "defaultValue" in s ? s.defaultValue : null;
};
