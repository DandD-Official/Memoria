"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseMmd, isPlainMarkdown } from "@/lib/mmd/parser";
import { MmdNodeList } from "@/components/mmd/node-list";
import { MmdReplacementProvider } from "@/components/mmd/replacement-context";
import { ResponsiveTable } from "@/components/ui/responsive-table";
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
}: {
  content: string;
  onReplaceBlock?: (raw: string, replacement: string) => void;
  mode?: MmdRenderMode;
  assetRegistry?: MmdAssetRegistry;
}) {
  if (isPlainMarkdown(content)) {
    // Fast path, and a deliberate safety net: documents with zero MMD
    // fences (100% of existing Notes/Reviewers today) render through
    // exactly the same code path as before MMD existed — byte-for-byte
    // the same react-markdown call — rather than going through the MMD
    // parser and back out again. Existing content cannot regress.
    return (
      <MmdRenderProvider mode={mode} assetRegistry={assetRegistry}>
        <div className="memora-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children, ...props }) => (
                <ResponsiveTable><table {...props}>{children}</table></ResponsiveTable>
              ),
            }}
          >{content}</ReactMarkdown>
        </div>
      </MmdRenderProvider>
    );
  }

  const doc = parseMmd(content);
  return (
    <MmdRenderProvider mode={mode} assetRegistry={assetRegistry}>
      <div className="memora-markdown">
        <MmdReplacementProvider onReplace={onReplaceBlock}>
          <MmdNodeList nodes={doc.children} />
        </MmdReplacementProvider>
      </div>
    </MmdRenderProvider>
  );
}
