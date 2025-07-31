"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarUploaderProps {
  value?: string; // The current base64 string
  onChange: (value: string) => void; // Function to update the form state
}

export const AvatarUploader = ({ value, onChange }: AvatarUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validation for image type, including GIF
      if (
        !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type,
        )
      ) {
        alert("Please select a valid image file (jpg, png, gif, webp).");
        return;
      }

      // Validation for file size
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please select an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          "bg-accent-foreground/50 relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-600 transition-colors hover:border-slate-400",
          { "border-slate-400": preview },
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Avatar Preview"
              className="h-full w-full rounded-full object-cover"
              fill
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="bg-primary absolute top-0 right-0 rounded-full p-1 text-white transition-colors hover:bg-red-500"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <UploadCloud size={32} />
            <span className="mt-2 text-sm">Upload</span>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        // Ensure GIF is in the accept list for the file dialog
        accept="image/png, image/jpeg, image/gif, image/webp"
      />
      {/* <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        Choose Image
      </Button> */}
    </div>
  );
};
