// components/FileField.tsx
"use client";

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUploadPanel } from "./FileUploadPanel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileSchema } from "../schemas/settings-schema";
import { type FileUploadPayload } from "../utils/file-pipeline";

interface FileFieldProps {
  path: string;
  schema: FileSchema;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const FileField: React.FC<FileFieldProps> = ({ path, schema }) => {
  const { watch, setValue } = useFormContext();
  const fileData = watch(path) as FileUploadPayload | null;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleClear = () => {
    setValue(path, null, { shouldDirty: true });
  };

  // FIX: Safely decode the data URI for viewing
  const getDecodedContent = () => {
    if (!fileData?.dataUri) return "No content to display.";
    try {
      const base64 = fileData.dataUri.split(",")[1];
      return base64 ? atob(base64) : "Invalid file format.";
    } catch (e) {
      console.error("Failed to decode base64 string:", e);
      return "Could not decode file content.";
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-700 p-4">
      <Label className="font-medium">{schema.label}</Label>
      {schema.description && (
        <p className="text-sm text-slate-400">{schema.description}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        {fileData ? (
          <div className="flex flex-grow items-center justify-between rounded-md bg-slate-800 p-3">
            <div>
              <p className="font-mono text-sm">{fileData.filename}</p>
              <p className="text-xs text-slate-400">
                {formatBytes(fileData.size)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewModalOpen(true)}
              >
                View
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <FileUploadPanel
            title="Upload File"
            // FIX: Add correct type for the payload
            onUploaded={(payload: FileUploadPayload) => {
              window.dispatchEvent(
                new CustomEvent("file-uploaded", { detail: { path, payload } }),
              );
            }}
          />
        )}
      </div>

      <AlertDialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <AlertDialogContent className="max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{fileData?.filename}</AlertDialogTitle>
            <AlertDialogDescription>
              Viewing file content. This is a read-only view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border bg-slate-900 p-4">
            <pre className="text-sm text-slate-300">{getDecodedContent()}</pre>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
