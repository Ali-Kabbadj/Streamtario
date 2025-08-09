// schemas/settings-schema.ts
export type FieldSchemaString = {
    name: string;
    label: string;
    isCore?: boolean;
    isExtensible?: boolean; // optional: core node that allows user-extensions
    description?: string;
    defaultValue: string;
    type: "string";
    options?: { value: string | number | boolean; label: string }[];
};

export type FieldSchemaNumber = {
    name: string;
    label: string;
    isCore?: boolean;
    isExtensible?: boolean;
    description?: string;
    defaultValue: number;
    type: "number";
    options?: { value: number; label: string }[];
};

export type FieldSchemaBoolean = {
    name: string;
    label: string;
    isCore?: boolean;
    isExtensible?: boolean;
    description?: string;
    defaultValue: boolean;
    type: "boolean";
};

export type FieldSchema = FieldSchemaString | FieldSchemaNumber | FieldSchemaBoolean;

export interface ObjectSchema {
    name: string;
    label: string;
    type: "object";
    isCore?: boolean;
    isExtensible?: boolean; // allow user to add children/files even if core
    description?: string;
    fields: SettingsSchema[];
    accepts?: string[]; // whitelist of child names allowed (optional)
}

export interface ArraySchema {
    name: string;
    label: string;
    type: "array";
    isCore?: boolean;
    isExtensible?: boolean;
    description?: string;
    itemLabel: string;
    defaultValue?: Record<string, unknown>[];
    itemSchema: {
        type: "object";
        fields: FieldSchema[];
    };
    accepts?: string[];
}

export type SettingsSchema = FieldSchema | ObjectSchema | ArraySchema;

/**
 * Default schema example including mpv core (isCore + isExtensible).
 * Keep this minimal/change to match your real defaults.
 */
export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema[] = [
    {
        name: "mpv",
        label: "MPV Player",
        type: "object",
        isCore: true,
        isExtensible: true, // users may add mpv conf, commands, scripts
        description: "mpv player settings, scripts, and uploads",
        fields: [
            {
                name: "mpv_conf",
                label: "mpv.conf content",
                type: "string",
                defaultValue: "",
            },
            {
                name: "lua_scripts",
                label: "Lua scripts",
                type: "array",
                itemLabel: "Lua script",
                defaultValue: [],
                itemSchema: {
                    type: "object",
                    fields: [
                        { name: "filename", label: "Filename", type: "string", defaultValue: "" },
                        { name: "content", label: "Content", type: "string", defaultValue: "" },
                    ],
                },
            },
            {
                name: "customCommands",
                label: "Custom MPV Commands",
                type: "array",
                itemLabel: "Command",
                defaultValue: [],
                itemSchema: {
                    type: "object",
                    fields: [
                        { name: "name", label: "Name", type: "string", defaultValue: "" },
                        { name: "command", label: "Command", type: "string", defaultValue: "" },
                    ],
                },
            },
        ],
    },

    {
        name: "appearance",
        label: "Appearance",
        type: "object",
        isCore: false,
        description: "Theme, scale and visual preferences",
        fields: [
            { name: "theme", label: "Theme", type: "string", defaultValue: "dark" },
            { name: "scale", label: "UI scale", type: "number", defaultValue: 1 },
        ],
    },

    {
        name: "streaming",
        label: "Streaming",
        type: "object",
        isCore: true,
        description: "Streaming / cache related settings",
        fields: [
            {
                name: "cacheSizeGb",
                label: "Cache Size (GB)",
                type: "number",
                defaultValue: 10,
                // options optional
            },
            { name: "streamWithoutCache", label: "Stream without cache", type: "boolean", defaultValue: false },
        ],
    },
];

/**
 * Helper to generate default data object (mirrors existing project function).
 */
export const generateDefaultData = (schema: SettingsSchema[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const s of schema) {
        if (s.type === "object") {
            out[s.name] = generateDefaultData(s.fields);
        } else if (s.type === "array") {
            out[s.name] = s.defaultValue ?? [];
        } else {
            out[s.name] = (s).defaultValue;
        }
    }
    return out;
};

export const DEFAULT_SETTINGS_DATA = generateDefaultData(DEFAULT_SETTINGS_SCHEMA);
