"use client";

import { createContext, useContext, useState } from "react";
import type { ModelOption } from "@/types/ModelOption"; 

interface ModelContextType {
  selectedModel: ModelOption;
  setSelectedModel: (value: ModelOption) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export const ModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedModel, setSelectedModel] = useState<ModelOption>("query");

  return (
    <ModelContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
};