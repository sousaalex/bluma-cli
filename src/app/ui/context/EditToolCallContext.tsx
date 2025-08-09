import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface EditToolCallContextValue {
  expandedIds: Set<number>;
  toggleExpansion: (id: number) => void;
}

const EditToolCallContext = createContext<EditToolCallContextValue | undefined>(undefined);

export const useEditToolCallContext = (): EditToolCallContextValue => {
  const ctx = useContext(EditToolCallContext);
  if (!ctx) {
    throw new Error("useEditToolCallContext must be used within EditToolCallProvider");
  }
  return ctx;
};

export const EditToolCallProvider = ({ children }: { children: ReactNode }) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpansion = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <EditToolCallContext.Provider value={{ expandedIds, toggleExpansion }}>
      {children}
    </EditToolCallContext.Provider>
  );
};