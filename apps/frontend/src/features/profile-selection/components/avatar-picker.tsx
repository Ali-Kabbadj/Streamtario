"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const defaultAvatars = [
  "/images/avatars/a4c65f709d4c0cb1b4329c12beb9cd78.jpg",
  "/images/avatars/56c6ed3a438a525acc5e883fc15798a9.jpg",
  "/images/avatars/92b4e7c57de1b5e1e8c5e883fd915450.jpg",
  "/images/avatars/87d239c65732f941a8f2d9cce9f245f9.jpg",
  "/images/avatars/e0b6164723e67c29decccc30d51b481e.jpg",
  "/images/avatars/c3362993f53cd865c4aeb711e8d0a175.gif",
];

interface AvatarPickerProps {
  value?: string;
  onChange: (value: string) => void;
}

export const AvatarPicker = ({ value, onChange }: AvatarPickerProps) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {defaultAvatars.map((src) => {
        const isSelected = value === src;
        return (
          <button
            key={src}
            type="button"
            onClick={() => onChange(src)}
            className="relative rounded-lg focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Avatar"
              className={cn(
                "h-24 w-24 rounded-lg object-cover transition-all",
                isSelected ? "scale-90 opacity-60" : "opacity-100",
              )}
            />
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2
                  className="h-12 w-12 text-white"
                  strokeWidth={3}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
