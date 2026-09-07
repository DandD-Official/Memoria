"use client";

import { AlertTriangle } from "lucide-react";
import { parseMmd, collectMmdErrors } from "@/lib/mmd/parser";
import { cn } from "@/lib/utils";

/**
 * Small helper for a per-error location hint: since the parser doesn't
 * track line numbers, the first line of the offending block's raw source
 * is the best "approximate location" signal available — see the doc
 * comment below for what a fuller story would need.
 */
function truncateRaw(raw: string, max = 50): string {
  const firstLine = raw.split("\n")[0];
  return firstLine.length > max ? `${firstLine.slice(0, max)}…` : firstLine;
}

/**
 * Non-blocking heads-up shown when content contains malformed MMD
 * (unknown block, missing required attribute, unterminated fence, etc).
 * Deliberately does NOT block saving — the parser is fail-safe by design
 * (mmd-spec.md §7): the content still renders, just as plain text for the
 * affected block, so there's nothing to force the user to fix before
 * proceeding.
 *
 * Two call sites:
 * - The reviewer paste-back preview (reviewer-wizard.tsx,
 *   guest-reviewer-flow.tsx) — surfaces issues in an AI response before
 *   the user saves it.
 * - The main editor's live diagnostics (components/markdown/editor.tsx,
 *   Milestone 15) — surfaces issues while the user is typing, debounced
 *   by the caller so this doesn't re-parse on every keystroke.
 *
 * Each error shows its reason plus a short raw-text snippet so the user
 * has a fighting chance of finding the offending block in their document
 * without line numbers (a real limitation — see .context/milestones.md,
 * Milestone 15, for what a fuller "approximate location" story would need).
 */
export function MmdValidationNotice({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) return null;
  const errors = collectMmdErrors(parseMmd(content));
  if (errors.length === 0) return null;

  const shown = errors.slice(0, 5);
  const remaining = errors.length - shown.length;

  return (
    <div className={cn("rounded-lg border border-accent-dark/30 bg-accent-soft/30 p-3 text-sm text-accent-dark", className ?? "mt-3")}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">
            {errors.length} block{errors.length > 1 ? "s" : ""} couldn&apos;t be parsed as Memoria Markdown —
            they&apos;ll show up as plain text instead.
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {shown.map((error, i) => (
              <li key={i}>
                {error.reason}
                <code className="ml-1.5 rounded bg-ink/10 px-1 py-0.5 font-mono text-xs text-ink-soft">
                  {truncateRaw(error.raw)}
                </code>
              </li>
            ))}
          </ul>
          {remaining > 0 && <p className="mt-1 text-xs">…and {remaining} more.</p>}
        </div>
      </div>
    </div>
  );
}
