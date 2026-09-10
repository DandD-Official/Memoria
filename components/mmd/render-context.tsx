"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { MmdAssetRegistry } from "@/lib/export/asset-registry";

export type MmdRenderMode = "screen" | "export";

interface MmdRenderContextValue {
  mode: MmdRenderMode;
  assetRegistry?: MmdAssetRegistry;
}

const MmdRenderContext = createContext<MmdRenderContextValue>({ mode: "screen" });

export function MmdRenderProvider({
  mode,
  assetRegistry,
  children,
}: MmdRenderContextValue & { children: ReactNode }) {
  return <MmdRenderContext.Provider value={{ mode, assetRegistry }}>{children}</MmdRenderContext.Provider>;
}

export function useMmdRenderContext(): MmdRenderContextValue {
  return useContext(MmdRenderContext);
}
