"use client";

import { createContext, useContext } from "react";

export type ReplaceMmdBlock = (raw: string, replacement: string) => void;

const ReplacementContext = createContext<ReplaceMmdBlock | undefined>(undefined);

export function MmdReplacementProvider({ onReplace, children }: { onReplace?: ReplaceMmdBlock; children: React.ReactNode }) {
  return <ReplacementContext.Provider value={onReplace}>{children}</ReplacementContext.Provider>;
}

export function useMmdReplacement() {
  return useContext(ReplacementContext);
}
