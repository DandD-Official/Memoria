"use client";

import { AlertTriangle } from "lucide-react";
import { analyzeMmd } from "@/lib/mmd/diagnostics";
import { cn } from "@/lib/utils";

export function MmdValidationNotice({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) return null;
  const errors = analyzeMmd(content);
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
                Line {error.line}:{error.col} ? {error.message}
                <code className="ml-1.5 rounded bg-ink/10 px-1 py-0.5 font-mono text-xs text-ink-soft">
                  {error.code}
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
