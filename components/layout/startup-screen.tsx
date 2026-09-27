"use client";
import { useEffect, useState } from "react";
import { MemoryMark } from "@/components/layout/brand";
/** Covers hydration only; no artificial delay or dependency on external assets. */
export function StartupScreen() {
  const [pending, setPending] = useState(true);
  useEffect(() => { setPending(false); }, []);
  if (!pending) return null;
  return <><div id="memoria-startup" role="status" className="pointer-events-none fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 bg-paper text-ink"><MemoryMark className="h-16 w-16 motion-safe:animate-pulse" /><p className="font-display text-2xl">Memoria</p><p className="text-sm text-ink-soft">Opening your learning space…</p></div><noscript><style>{"#memoria-startup { display: none !important; }"}</style></noscript></>;
}
