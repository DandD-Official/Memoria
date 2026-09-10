"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredCodeTheme, type CodeThemeId } from "@/lib/mmd/code-themes";

const STORAGE_KEY = "memora-code-theme";

interface CodeThemeContextValue {
  codeTheme: CodeThemeId;
  setCodeTheme: (theme: CodeThemeId) => void;
}

const CodeThemeContext = createContext<CodeThemeContextValue | null>(null);

function readStoredCodeTheme(): CodeThemeId {
  return getStoredCodeTheme();
}

export function CodeThemeProvider({ children }: { children: React.ReactNode }) {
  const [codeTheme, setCodeThemeState] = useState<CodeThemeId>("memoria-dark");

  useEffect(() => setCodeThemeState(readStoredCodeTheme()), []);

  const setCodeTheme = useCallback((next: CodeThemeId) => {
    setCodeThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ codeTheme, setCodeTheme }), [codeTheme, setCodeTheme]);
  return <CodeThemeContext.Provider value={value}>{children}</CodeThemeContext.Provider>;
}

export function useCodeTheme(): CodeThemeContextValue {
  const value = useContext(CodeThemeContext);
  if (!value) throw new Error("useCodeTheme must be used within CodeThemeProvider");
  return value;
}
