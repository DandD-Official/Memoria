"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { MmdAssetRegistry } from "@/lib/export/asset-registry";

export type MmdRenderMode = "screen" | "export";

interface MmdRenderContextValue {
  mode: MmdRenderMode;
  onSourceLine?: (line: number) => void;
  assetRegistry?: MmdAssetRegistry;
  resolvedAssets?: Record<string, string | null>;
}

const MmdRenderContext = createContext<MmdRenderContextValue>({ mode: "screen" });

export function MmdRenderProvider({
  mode,
  onSourceLine,
  assetRegistry,
  resolvedAssets,
  children,
}: MmdRenderContextValue & { children: ReactNode }) {
  return <MmdRenderContext.Provider value={{ mode, onSourceLine, assetRegistry, resolvedAssets }}>{children}</MmdRenderContext.Provider>;
}

export function useMmdRenderContext(): MmdRenderContextValue {
  return useContext(MmdRenderContext);
}
