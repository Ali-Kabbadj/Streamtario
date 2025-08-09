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
      // We only save if the form has actually been changed by the user
      if (formState.isDirty) {
        onSave(getValues());
      }
    });
    return () => subscription.unsubscribe();
    // FIX: This stable dependency array ensures the hook runs only once on mount.
  }, [watch, formState, getValues, onSave]);

  // This component renders nothing. It is purely for handling the side-effect.
  return null;
};
