// components/FileUploadPanel.tsx
"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  prepareUploadPayload,
  type FileUploadPayload,
} from "../utils/file-pipeline";

interface Props {
  accept?: string;
  title?: string;
  onUploaded: (payload: FileUploadPayload) => void;
}

export const FileUploadPanel: React.FC<Props> = ({
  accept = ".conf,text/*",
  title = "Upload file",
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChoose = (file: File | null) => {
    if (!file) return;

    prepareUploadPayload(file)
      .then((payload) => {
        onUploaded(payload);
      })
      .catch((err) => {
        console.error("File preparation error:", err);
      });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={title}
        // Reset the input value on change so selecting the same file again works
        onChange={(ev) => {
          const file = ev.target.files?.[0] ?? null;
          onChoose(file);
          ev.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" /> {title}
      </Button>
    </>
  );
};
