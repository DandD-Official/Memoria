"use client";

import { MmdRenderer } from "@/components/mmd/renderer";

// Kept as a thin re-export so every existing import of
// `@/components/markdown/renderer` (note-detail, reviewer-detail, guest
// flows, the public collection viewer, the editor preview pane) keeps
// working unchanged. The actual rendering — plain Markdown AND Memoria
// Markdown (MMD) — now lives in components/mmd/renderer.tsx. See
// .context/mmd-spec.md and .context/project-architecture.md.
export function MarkdownRenderer({ content, onReplaceBlock }: { content: string; onReplaceBlock?: (raw: string, replacement: string) => void }) {
  return <MmdRenderer content={content} onReplaceBlock={onReplaceBlock} />;
}
