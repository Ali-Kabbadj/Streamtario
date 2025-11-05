export type FieldSchemaString = { name: string; label: string; isCore?: boolean; description?: string; defaultValue: string; type: "string"; options?: { value: string; label: string }[]; };
export type FieldSchemaNumber = { name: string; label: string; isCore?: boolean; description?: string; defaultValue: number; type: "number"; options?: { value: number; label: string }[]; };
export type FieldSchemaBoolean = { name: string; label: string; isCore?: boolean; description?: string; defaultValue: boolean; type: "boolean"; };
export interface FileSchema { name: string; label: string; type: 'file'; isCore?: boolean; description?: string; defaultValue: Record<string, unknown> | null; }
export type FieldSchema = FieldSchemaString | FieldSchemaNumber | FieldSchemaBoolean | FileSchema;
export interface ObjectSchema { name: string; label: string; type: "object"; isCore?: boolean; description?: string; fields: SettingsSchema[]; }
export interface ArraySchema { name: string; label: string; type: "array"; isCore?: boolean; description?: string; itemLabel: string; defaultValue?: Record<string, unknown>[]; itemSchema: { type: "object"; fields: FieldSchema[]; }; }
export type SettingsSchema = FieldSchema | ObjectSchema | ArraySchema;

export const DEFAULT_SETTINGS_SCHEMA: SettingsSchema[] = [
    {
        name: "mpv",
        label: "MPV Player",
        type: "object",
        isCore: true,
        description: "Configure MPv player commands, scripts, and file-based settings.",
        fields: [
            {
                name: "mpv_conf_file",
                label: "mpv.conf File",
                type: "file",
                defaultValue: null,
                description: "Upload your custom mpv.conf file."
            },
            { name: "custom_commands", label: "Custom MPV Commands", type: "array", itemLabel: "Command", defaultValue: [], itemSchema: { type: "object", fields: [{ name: "name", label: "Name", type: "string", defaultValue: "New Command" }, { name: "command", label: "Command", type: "string", defaultValue: "" }] }, },
            { name: "lua_scripts", label: "Lua Scripts", type: "array", itemLabel: "Script", defaultValue: [], itemSchema: { type: "object", fields: [{ name: "name", label: "Script Name", type: "string", defaultValue: "new-script.lua" }, { name: "content", label: "Script Content", type: "string", defaultValue: "-- Your Lua script code here" }] }, },
        ],
    },
    { name: "webview", label: "WebView2", type: "object", isCore: true, description: "Manage commands for the underlying WebView2 engine.", fields: [{ name: "webview_commands", label: "WebView2 Commands", type: "array", itemLabel: "Command", defaultValue: [], itemSchema: { type: "object", fields: [{ name: "name", label: "Name", type: "string", defaultValue: "New Command" }, { name: "command", label: "Command", type: "string", defaultValue: "" }] }, },], },
    {
        name: "appearance",
        label: "Appearance",
        type: "object",
        isCore: true,
        description: "Theme, scale and visual preferences.",
        fields: [
            { name: "theme", label: "Theme", type: "string", defaultValue: "dark", options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' },] },
            { name: "ui_scale", label: "UI Scale", type: "number", defaultValue: 1 },
        ],
    },
    {
        name: "streaming",
        label: "Streaming",
        type: "object",
        isCore: true,
        description: "Streaming and cache-related settings.",
        fields: [
            { name: "cache_size_gb", label: "Cache Size (GB)", type: "number", defaultValue: 10, options: [{ value: 2, label: '2 GB' }, { value: 5, label: '5 GB' }, { value: 10, label: '10 GB' }, { value: 20, label: '20 GB' }, { value: 50, label: '50 GB' },] },
            { name: "stream_without_cache", label: "Stream without cache", type: "boolean", defaultValue: false },
        ],
    },
];

export const generateDefaultData = (schema: SettingsSchema[]): Record<string, unknown> => { const out: Record<string, unknown> = {}; for (const s of schema) { if (s.type === "object") { out[s.name] = generateDefaultData(s.fields); } else if (s.type === "array") { out[s.name] = s.defaultValue ?? []; } else { out[s.name] = (s).defaultValue; } } return out; };
export const DEFAULT_SETTINGS_DATA = generateDefaultData(DEFAULT_SETTINGS_SCHEMA);