// components/AutoSaveHandler.tsx
"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

interface AutoSaveHandlerProps {
  onSave: (data: Record<string, unknown>) => void;
}

export const AutoSaveHandler: React.FC<AutoSaveHandlerProps> = ({ onSave }) => {
  const { watch, formState, getValues } = useFormContext();

  useEffect(() => {
    const subscription = watch(() => {
      if (formState.isDirty) {
        onSave(getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formState, getValues, onSave]);

  return null;
};
