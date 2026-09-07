import { AlertTriangle } from "lucide-react";
import type { MmdErrorNode } from "@/lib/mmd/ast";

/**
 * Fail-safe rendering for anything the parser couldn't turn into a valid
 * block (unknown block type, missing required attribute, unterminated
 * fence, invalid nesting). Per mmd-spec.md §7: never crashes, never
 * drops content — the original raw source is always shown so the user
 * can see exactly what to fix.
 */
export function MmdErrorBlock({ node }: { node: MmdErrorNode }) {
  return (
    <div
      role="note"
      className="my-4 rounded-lg border border-dashed border-danger/40 bg-danger/5 p-4"
    >
      <div className="flex items-start gap-2 text-sm font-medium text-danger">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{node.reason}</span>
      </div>
      <pre className="mt-2 max-h-48 overflow-auto rounded bg-ink/5 p-3 font-mono text-xs text-ink-soft">
        {node.raw}
      </pre>
    </div>
  );
}
