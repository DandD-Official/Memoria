"use client";

import { AlertTriangle, Braces } from "lucide-react";
import { mapMmdBlocks } from "@/lib/mmd/block-map";

export function MmdBlockMap({ content, onSelectLine }: { content: string; onSelectLine: (line: number) => void }) {
  const entries = mapMmdBlocks(content);
  if (!entries.length) return null;

  return (
    <div className="border-t border-line bg-ink/[0.015] px-4 py-3" aria-label="MMD block structure">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        <Braces className="h-3.5 w-3.5" /> MMD block map
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((entry) => (
          <button
            key={`${entry.openLine}-${entry.name}`}
            type="button"
            onClick={() => onSelectLine(entry.openLine)}
            className={`rounded-md border px-2 py-1 text-left font-mono text-[11px] ${entry.closeLine ? "border-line bg-surface text-ink-soft hover:border-accent" : "border-danger/40 bg-danger/5 text-danger"}`}
            style={{ marginLeft: `${Math.min(entry.depth, 4) * 6}px` }}
            title={`Jump to line ${entry.openLine}`}
          >
            {entry.closeLine ? (
              <><span className="font-semibold text-ink">L{entry.openLine} :::${entry.name}</span><span className="mx-1 text-ink-faint">→</span><span>closes L{entry.closeLine}</span></>
            ) : (
              <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />L{entry.openLine} :::${entry.name} —unclosed</span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">Each bare <code>:::</code> closes the most recently opened block. Click a block to jump to its opening line.</p>
    </div>
  );
}
