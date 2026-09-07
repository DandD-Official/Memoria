import type { ReactNode } from "react";
import { BookMarked, ClipboardList, FlaskConical, KeyRound, Star } from "lucide-react";
import type { MmdBlockNode } from "@/lib/mmd/ast";
import { cn } from "@/lib/utils";

/** :::definition{term="..."} — a highlighted term + definition pair. */
export function DefinitionBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-line bg-surface p-4">
      <div className="mb-1.5 flex items-center gap-2 text-accent-dark">
        <BookMarked className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-display text-base font-medium text-ink">{node.attrs.term}</span>
      </div>
      <div className="text-sm text-ink-soft [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}

/** :::key-concept — flags an idea central to the topic. */
export function KeyConceptBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border-l-4 border-accent bg-accent-soft/30 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-dark">
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        Key Concept
      </div>
      <div className="text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </div>
  );
}

/** :::example{title="..."} */
export function ExampleBlock({ node, children }: { node: MmdBlockNode; children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-line bg-ink/[0.02] p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        {node.attrs.title || "Example"}
      </div>
      <div className="text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </div>
  );
}

/** :::important — content likely to appear on an exam or easy to forget. */
export function ImportantBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-danger/30 bg-danger/[0.04] p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-danger">
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        Important
      </div>
      <div className={cn("text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0")}>{children}</div>
    </div>
  );
}

/** :::summary — short recap of a section. */
export function SummaryBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg bg-ink/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
        Summary
      </div>
      <div className="text-sm text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </div>
  );
}
