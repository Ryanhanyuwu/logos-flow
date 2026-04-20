"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface CalmModeContextType {
  isCalmMode: boolean;
  isAcousticMode: boolean;
  toggleCalmMode: () => void;
  toggleAcousticMode: () => void;
}

const CalmModeContext = createContext<CalmModeContextType | null>(null);

export function CalmModeProvider({ children }: { children: ReactNode }) {
  const [isCalmMode, setIsCalmMode] = useState(false);
  const [isAcousticMode, setIsAcousticMode] = useState(false);

  function toggleCalmMode() {
    setIsCalmMode((prev) => {
      if (prev) setIsAcousticMode(false);
      return !prev;
    });
  }

  function toggleAcousticMode() {
    setIsAcousticMode((prev) => !prev);
  }

  return (
    <CalmModeContext.Provider
      value={{ isCalmMode, isAcousticMode, toggleCalmMode, toggleAcousticMode }}
    >
      {children}
    </CalmModeContext.Provider>
  );
}

export function useCalmMode() {
  const ctx = useContext(CalmModeContext);
  if (!ctx) throw new Error("useCalmMode must be used within CalmModeProvider");
  return ctx;
}
