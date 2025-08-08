"use client";

import { createContext, useContext } from "react";

interface SettingsFormContextType {
  triggerSave: () => void;
}

const SettingsFormContext = createContext<SettingsFormContextType | undefined>(
  undefined,
);

export const SettingsFormProvider = SettingsFormContext.Provider;

export const useSettingsForm = (): SettingsFormContextType => {
  const context = useContext(SettingsFormContext);
  if (!context) {
    throw new Error(
      "useSettingsForm must be used within a SettingsFormProvider",
    );
  }
  return context;
};
