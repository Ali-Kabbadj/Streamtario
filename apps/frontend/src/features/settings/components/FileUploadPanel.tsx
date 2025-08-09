// components/FileUploadPanel.tsx
"use client";

import React, { useRef, useState } from "react";
import { prepareUploadPayload } from "../utils/file-pipeline";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

/**
 * FileUploadPanel - small UI for uploading a file for a schema node.
 * - path: dotted path in form (e.g. "mpv.mpv_conf")
 * - onUploaded: callback(payload) where payload is the prepared object
 *
 * This component does NOT attempt to call server; it prepares payload and calls onUploaded.
 */

interface Props {
  accept?: string;
  title?: string;
  onUploaded?: (payload: {
    filename: string;
    mime: string;
    size: number;
    dataUri: string;
  }) => void;
}

export const FileUploadPanel: React.FC<Props> = ({
  accept = ".conf,text/*",
  title = "Upload file",
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const onChoose = (file: File | null) => {
    if (!file) return;
    setPendingName(file.name);
    prepareUploadPayload(file)
      .then((p) => {
        onUploaded?.(p);
      })
      .catch((err) => {
        console.error("file prepare error", err);
        setPendingName(null);
      });
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={title}
        onChange={(ev) => {
          const f = ev.target.files?.[0] ?? null;
          onChoose(f);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" /> {title}
      </Button>
      {pendingName && (
        <span className="text-sm text-slate-300">{pendingName}</span>
      )}
    </div>
  );
};
