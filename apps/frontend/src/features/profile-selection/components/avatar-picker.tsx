"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

// A list of our default avatar images
const defaultAvatars = [
  "https://i.pinimg.com/736x/a4/c6/5f/a4c65f709d4c0cb1b4329c12beb9cd78.jpg",
  "https://i.pinimg.com/1200x/56/c6/ed/56c6ed3a438a525acc5e883fc15798a9.jpg",
  "https://i.pinimg.com/1200x/92/b4/e7/92b4e7c57de1b5e1e8c5e883fd915450.jpg",
  "https://i.pinimg.com/736x/87/d2/39/87d239c65732f941a8f2d9cce9f245f9.jpg",
  "https://i.pinimg.com/736x/e0/b6/16/e0b6164723e67c29decccc30d51b481e.jpg",
  "https://i.pinimg.com/originals/c3/36/29/c3362993f53cd865c4aeb711e8d0a175.gif",
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
            type="button" // Important to prevent form submission
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
