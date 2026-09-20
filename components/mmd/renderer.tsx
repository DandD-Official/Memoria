"use client";

import { InlineMarkdown } from "@/components/mmd/inline-markdown";
import { parseMmd, isPlainMarkdown } from "@/lib/mmd/parser";
import { MmdNodeList } from "@/components/mmd/node-list";
import { MmdReplacementProvider } from "@/components/mmd/replacement-context";
import { MmdRenderProvider, type MmdRenderMode } from "@/components/mmd/render-context";
import type { MmdAssetRegistry } from "@/lib/export/asset-registry";

/**
 * Renders Memoria Markdown (MMD) — see .context/mmd-spec.md. This is the
 * new home for what components/markdown/renderer.tsx used to do directly;
 * that file now just re-exports this one under its old name so every
 * existing import site (note-detail, reviewer-detail, guest flows, the
 * public collection viewer, the editor's preview pane) keeps working
 * unchanged.
 */
export function MmdRenderer({
  content,
  onReplaceBlock,
  mode = "screen",
  assetRegistry,
  resolvedAssets,
}: {
  content: string;
  onReplaceBlock?: (raw: string, replacement: string) => void;
  mode?: MmdRenderMode;
  assetRegistry?: MmdAssetRegistry;
  resolvedAssets?: Record<string, string | null>;
}) {
  if (isPlainMarkdown(content)) {
    // Skip MMD parsing, while sharing code, table, and inline rendering
    // with Markdown inside custom blocks.
    return (
      <MmdRenderProvider mode={mode} assetRegistry={assetRegistry} resolvedAssets={resolvedAssets}>
        <div className="memora-markdown">
          <InlineMarkdown content={content} />
        </div>
      </MmdRenderProvider>
    );
  }

  const doc = parseMmd(content);
  return (
    <MmdRenderProvider mode={mode} assetRegistry={assetRegistry} resolvedAssets={resolvedAssets}>
      <div className="memora-markdown">
        <MmdReplacementProvider onReplace={onReplaceBlock}>
          <MmdNodeList nodes={doc.children} />
        </MmdReplacementProvider>
      </div>
    </MmdRenderProvider>
  );
}
