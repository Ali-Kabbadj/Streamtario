export type FieldSchema =
    | {
        name: string;
        label: string;
        isCore?: boolean;
        description?: string;
        defaultValue: string;
        type: "string";
        options?: { value: string; label: string }[];
    }
    | {
        name: string;
        label: string;
        isCore?: boolean;
        description?: string;
        defaultValue: number;
        type: "number";
        options?: { value: number; label: string }[];
    }
    | {
        name: string;
        label: string;
        isCore?: boolean;
        description?: string;
        defaultValue: boolean;
        type: "boolean";
    };

export interface ObjectSchema {
    name: string;
    label: string;
    isCore?: boolean;
    description?: string;
    type: "object";
    fields: SettingsSchema[];
    accepts?: string[]; // Defines what schema item 'names' this object can accept as children
}

export interface ArraySchema {
    name: string;
    label: string;
    isCore?: boolean;
    description?: string;
    itemLabel: string;
    type: "array";
    defaultValue: Record<string, unknown>[];
    itemSchema: {
        type: "object";
        fields: FieldSchema[];
    };
    accepts?: string[];
}

export type SettingsSchema = FieldSchema | ObjectSchema | ArraySchema;

export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema[] = [
    {
        name: "streaming",
        label: "Streaming",
        isCore: true,
        type: "object",
        fields: [
            {
                name: "cacheSizeGb", type: "number", label: "Cache Size",
                description: "Maximum disk space for streaming cache.", defaultValue: 10, isCore: true,
                options: [{ value: 2, label: "2 GB" }, { value: 10, label: "10 GB" }, { value: 50, label: "50 GB" }, { value: -1, label: "Unlimited" }],
            },
            { name: "downloadSpeedLimitKbps", type: "number", label: "Download Speed Limit (KB/s)", description: "Set to -1 for unlimited.", defaultValue: -1, isCore: true, },
            { name: "uploadSpeedLimitKbps", type: "number", label: "Upload Speed Limit (KB/s)", description: "Set to -1 for unlimited.", defaultValue: -1, isCore: true, },
            { name: "maxPeers", type: "number", label: "Max Peer Connections", description: "Maximum number of peers to connect to per torrent.", defaultValue: 25, isCore: true, },
            { name: "streamWithoutCache", type: "boolean", label: "Stream Without Cache (Memory Mode)", description: "Stream directly to memory. Uses more RAM but no disk space.", defaultValue: false, isCore: true, },
        ],
    },
    {
        name: "preferences",
        label: "Preferences",
        type: "object",
        isCore: true,
        fields: [
            { name: "preferredAudioLanguage", type: "string", label: "Preferred Audio Language", description: "Default audio track language (ISO 639-2 code).", defaultValue: "eng", isCore: true, },
            { name: "preferredSubtitleLanguage", type: "string", label: "Preferred Subtitle Language", description: "Default subtitle language (ISO 639-2 code).", defaultValue: "eng", isCore: true, },
        ],
    },
    {
        name: "mpv",
        type: "object",
        label: "MPV Player Settings",
        isCore: true,
        accepts: ["customCommands"],
        fields: [
            {
                name: "customCommands",
                type: "array",
                label: "Custom MPV Commands",
                description: "Add custom commands accessible in the player.",
                itemLabel: "Command",
                isCore: true,
                // FIX: Ensure the default schema has a default value for the array.
                defaultValue: [],
                itemSchema: {
                    type: "object",
                    fields: [
                        { name: "name", type: "string", label: "Command Name", description: "A friendly name for the command (e.g., 'Next Frame').", defaultValue: "", },
                        { name: "command", type: "string", label: "MPV Command", description: "The raw MPV command string (e.g., 'frame-step').", defaultValue: "", },
                    ],
                },
            },
        ],
    },
];

export const generateDefaultData = (schema: SettingsSchema[]): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (const item of schema) {
        if (item.type === "object") {
            data[item.name] = generateDefaultData(item.fields);
        } else if (item.type === "array") {
            // Use the schema's default value for arrays if it exists
            data[item.name] = item.defaultValue ?? [];
        } else {
            data[item.name] = item.defaultValue;
        }
    }
    return data;
};

export const DEFAULT_SETTINGS_DATA = generateDefaultData(DEFAULT_SETTINGS_SCHEMA);