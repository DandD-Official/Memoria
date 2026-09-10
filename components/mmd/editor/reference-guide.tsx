"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { BLOCK_DEFS, type BlockDefinition } from "@/lib/mmd/spec-blocks";
import { EXAMPLE_SYNTAX } from "@/lib/mmd/ai-instructions";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<BlockDefinition["category"], string> = {
  code: "Code blocks",
  callout: "Callouts",
  educational: "Educational blocks",
  layout: "Layout",
  media: "Media",
  diagram: "Diagrams",
  ai: "AI workflow",
};

const CATEGORY_ORDER: BlockDefinition["category"][] = [
  "code",
  "callout",
  "educational",
  "layout",
  "media",
  "diagram",
  "ai",
];

// "column" only appears nested inside "columns" — same reasoning as
// components/mmd/editor/insert-menu.tsx and lib/mmd/ai-instructions.ts.
const HIDDEN = new Set(["column"]);

function CopyableExample({ blockName, example }: { blockName: string; example: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(example);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group relative mt-1.5 rounded-md bg-ink/5">
      <pre className="overflow-x-auto p-2.5 pr-9 font-mono text-xs text-ink-soft">{example}</pre>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy example for ${blockName}`}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded text-ink-faint opacity-0 transition hover:bg-ink/10 hover:text-ink group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/**
 * The complete Memoria Markdown reference — every supported block, its
 * description, and a copyable example. Generated directly from
 * lib/mmd/spec-blocks.ts (BLOCK_DEFS) and the same EXAMPLE_SYNTAX map
 * lib/mmd/ai-instructions.ts uses for the AI prompt, so this guide, the
 * AI's instructions, and the parser's actual behavior cannot drift apart
 * — see .context/ai-content-generation.md.
 */
export function MmdReferenceGuide() {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((category) => {
        const defs = Object.values(BLOCK_DEFS).filter((d) => d.category === category && !HIDDEN.has(d.name));
        if (defs.length === 0) return null;
        return (
          <div key={category}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="space-y-3">
              {defs.map((def) => (
                <div key={def.name}>
                  <p className="text-ink">
                    <code className={cn("rounded bg-surface px-1 font-mono text-xs")}>:::{def.name}</code>{" "}
                    <span className="text-ink-soft">— {def.description}</span>
                  </p>
                  {EXAMPLE_SYNTAX[def.name] && (
                    <CopyableExample blockName={def.name} example={EXAMPLE_SYNTAX[def.name]} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
