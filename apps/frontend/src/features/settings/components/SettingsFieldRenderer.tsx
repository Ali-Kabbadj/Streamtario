"use client";

import type { SettingsSchema } from "../schemas/settings-schema";
import { SettingsFormField } from "./SettingsFormField";

interface FieldRendererProps {
  schema: SettingsSchema;
  path: string;
}

export const SettingsFieldRenderer = ({ schema, path }: FieldRendererProps) => {
  switch (schema.type) {
    case "string":
    case "number":
    case "boolean":
      return <SettingsFormField schema={schema} path={path} />;

    case "object":
      // The parent SortableSchemaItem is responsible for rendering the container
      // and recursively calling the renderer for its children.
      // Returning null here prevents duplicate rendering.
      return null;

    case "array":
      return <div className="pl-6">Array rendering to be implemented</div>;

    default:
      return null;
  }
};
