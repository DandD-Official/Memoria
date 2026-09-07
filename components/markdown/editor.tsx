"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Table2, Quote, HelpCircle, Eye, Pencil } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { MmdInsertMenu } from "@/components/mmd/editor/insert-menu";
import { MmdReferenceGuide } from "@/components/mmd/editor/reference-guide";
import { MmdValidationNotice } from "@/components/mmd/validation-notice";
import { INSERT_TEMPLATES } from "@/lib/mmd/editor-templates";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
}

const TABLE_TEMPLATE = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |\n`;

export function MarkdownEditor({ value, onChange, minRows = 16, className }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showGuide, setShowGuide] = useState(false);
  const [showFullMmdReference, setShowFullMmdReference] = useState(false);

  // Debounced so malformed-MMD diagnostics (Milestone 15) don't re-parse
  // the whole document on every keystroke — see .context/mmd-spec.md's
  // performance guidance ("avoid repeated parsing of unchanged content").
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), 400);
    return () => clearTimeout(timeout);
  }, [value]);

  function applyEdit(transform: (selected: string) => string, options?: { block?: boolean }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);

    let insertion = transform(selected);
    let prefix = before;
    // Block-level edits (headings, lists, quote) should start on their own line.
    if (options?.block && before.length > 0 && !before.endsWith("\n")) {
      prefix = before + "\n";
    }

    const next = prefix + insertion + after;
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = prefix.length + insertion.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function insertMmdBlock(blockName: string) {
    const template = INSERT_TEMPLATES[blockName];
    if (!template || template.disabled) return;
    applyEdit(template.build, { block: true });
  }

  const toolbarButtons = [
    { icon: Heading1, label: "Heading", action: () => applyEdit((s) => `# ${s || "Heading"}`, { block: true }) },
    { icon: Heading2, label: "Subheading", action: () => applyEdit((s) => `## ${s || "Subheading"}`, { block: true }) },
    { icon: Bold, label: "Bold", action: () => applyEdit((s) => `**${s || "bold text"}**`) },
    { icon: Italic, label: "Italic", action: () => applyEdit((s) => `*${s || "italic text"}*`) },
    { icon: List, label: "Bullet list", action: () => applyEdit((s) => (s ? s.split("\n").map((l) => `- ${l}`).join("\n") : "- List item"), { block: true }) },
    { icon: ListOrdered, label: "Numbered list", action: () => applyEdit((s) => (s ? s.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n") : "1. List item"), { block: true }) },
    { icon: Quote, label: "Quote / callout", action: () => applyEdit((s) => `> ${s || "Important note"}`, { block: true }) },
    { icon: Table2, label: "Table", action: () => applyEdit(() => TABLE_TEMPLATE, { block: true }) },
  ];

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink/[0.02] px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={btn.label}
              onClick={btn.action}
              disabled={mode === "preview"}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-40"
            >
              <btn.icon className="h-4 w-4" />
            </button>
          ))}
          <button
            type="button"
            title="Formatting guide"
            onClick={() => setShowGuide((v) => !v)}
            className={cn("flex h-8 w-8 items-center justify-center rounded-md hover:bg-ink/5", showGuide ? "text-accent-dark" : "text-ink-soft hover:text-ink")}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <MmdInsertMenu onInsert={insertMmdBlock} disabled={mode === "preview"} />
        </div>
        <div className="flex gap-1 rounded-md bg-ink/5 p-0.5">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", mode === "edit" ? "bg-surface text-ink shadow-sm" : "text-ink-faint")}
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs font-medium", mode === "preview" ? "bg-surface text-ink shadow-sm" : "text-ink-faint")}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="border-b border-line bg-accent-soft/30 px-4 py-3 text-xs text-ink-soft">
          <p className="mb-1.5 font-medium text-ink">Markdown quick guide</p>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <p><code className="rounded bg-surface px-1"># Heading</code> → big heading</p>
            <p><code className="rounded bg-surface px-1">**bold**</code> → <strong>bold</strong></p>
            <p><code className="rounded bg-surface px-1">*italic*</code> → <em>italic</em></p>
            <p><code className="rounded bg-surface px-1">- item</code> → bullet list</p>
            <p><code className="rounded bg-surface px-1">1. item</code> → numbered list</p>
            <p><code className="rounded bg-surface px-1">&gt; note</code> → callout / quote</p>
          </div>
          <p className="mt-2 mb-1 font-medium text-ink">Tables — put a header row, then a divider row of dashes, then data rows:</p>
          <pre className="overflow-x-auto rounded bg-surface p-2 font-mono text-[11px] leading-tight text-ink">
{`| Term    | Meaning         |
|---------|-----------------|
| Mitosis | Cell division   |`}
          </pre>
          <p className="mt-1">Click the table icon above to insert this template automatically, then edit the cells.</p>

          <p className="mt-3 mb-1 font-medium text-ink">
            Memoria Markdown — richer blocks via the <span className="italic">Insert</span> menu
          </p>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <p><code className="rounded bg-surface px-1">:::note ... :::</code> → note / tip / warning / etc.</p>
            <p><code className="rounded bg-surface px-1">:::definition{"{"}term=&quot;X&quot;{"}"}</code> → defines a term</p>
            <p><code className="rounded bg-surface px-1">:::section{"{"}title=&quot;X&quot;{"}"}</code> → titled section</p>
            <p><code className="rounded bg-surface px-1">:::card ... :::</code> → content card</p>
            <p><code className="rounded bg-surface px-1">:::columns ... :::</code> → side-by-side layout</p>
            <p><code className="rounded bg-surface px-1">:::details{"{"}title=&quot;X&quot;{"}"}</code> → collapsible content</p>
          </div>
          <p className="mt-1">
            These blocks are plain text and work anywhere in the document — the Insert menu just saves you
            typing the syntax by hand. Unknown or mistyped blocks show a clear warning instead of breaking
            the rest of your document.
          </p>

          <button
            type="button"
            onClick={() => setShowFullMmdReference((v) => !v)}
            className="mt-2 text-xs font-medium text-accent-dark underline-offset-2 hover:underline"
          >
            {showFullMmdReference ? "Hide" : "Show"} the complete Memoria Markdown reference
          </button>
          {showFullMmdReference && (
            <div className="mt-3 border-t border-line/60 pt-3">
              <MmdReferenceGuide />
            </div>
          )}
        </div>
      )}

      {mode === "edit" ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={minRows}
            className="w-full resize-y bg-surface p-4 font-mono text-sm text-ink outline-none"
            placeholder="# Untitled&#10;&#10;Start writing in Markdown…"
          />
          <MmdValidationNotice content={debouncedValue} className="mx-4 mb-4" />
        </>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto bg-surface p-4">
          {value.trim() ? <MarkdownRenderer content={value} /> : <p className="text-sm text-ink-faint">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}
