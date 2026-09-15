"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Eye, HelpCircle, Heading1, Heading2, Italic, List, ListOrdered, Pencil, Quote, Table2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { MmdInsertMenu } from "@/components/mmd/editor/insert-menu";
import { MmdDiagramPicker } from "@/components/mmd/editor/diagram-picker";
import { MmdStyleMenu } from "@/components/mmd/editor/style-menu";
import { MmdReferenceGuide } from "@/components/mmd/editor/reference-guide";
import { MmdBlockMap } from "@/components/mmd/editor/block-map";
import { MmdValidationNotice } from "@/components/mmd/validation-notice";
import { Tooltip } from "@/components/ui/tooltip";
import { INSERT_TEMPLATES } from "@/lib/mmd/editor-templates";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
}

type EditorMode = "edit" | "split" | "preview";

const TABLE_TEMPLATE = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |\n`;

export function MarkdownEditor({ value, onChange, minRows = 16, className }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [showGuide, setShowGuide] = useState(false);
  const [showFullMmdReference, setShowFullMmdReference] = useState(false);
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
    const insertion = transform(selected);
    const prefix = options?.block && before.length > 0 && !before.endsWith("\n") ? `${before}\n` : before;
    onChange(prefix + insertion + after);
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

  function insertStyledCard(attrs: string) {
    applyEdit((selected) => `:::card{${attrs}}\n${selected || "Write the highlighted idea here."}\n:::\n`, { block: true });
  }

  function appendDiagram(id: string) {
    applyEdit(() => `:::diagram{id="${id}"}\n:::\n`, { block: true });
  }

  function jumpToLine(line: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    const offset = lines.slice(0, Math.max(0, line - 1)).reduce((total, current) => total + current.length + 1, 0);
    textarea.focus();
    textarea.setSelectionRange(offset, offset + (lines[line - 1]?.length ?? 0));
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
    textarea.scrollTop = Math.max(0, (line - 3) * lineHeight);
  }

  const textTools = [
    { icon: Heading1, label: "Heading", action: () => applyEdit((s) => `# ${s || "Heading"}`, { block: true }) },
    { icon: Heading2, label: "Subheading", action: () => applyEdit((s) => `## ${s || "Subheading"}`, { block: true }) },
    { icon: Bold, label: "Bold", action: () => applyEdit((s) => `**${s || "bold text"}**`) },
    { icon: Italic, label: "Italic", action: () => applyEdit((s) => `*${s || "italic text"}*`) },
  ];
  const structureTools = [
    { icon: List, label: "Bullet list", action: () => applyEdit((s) => (s ? s.split("\n").map((l) => `- ${l}`).join("\n") : "- List item"), { block: true }) },
    { icon: ListOrdered, label: "Numbered list", action: () => applyEdit((s) => (s ? s.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n") : "1. List item"), { block: true }) },
    { icon: Quote, label: "Quote", action: () => applyEdit((s) => `> ${s || "Important note"}`, { block: true }) },
    { icon: Table2, label: "Table", action: () => applyEdit(() => TABLE_TEMPLATE, { block: true }) },
  ];

  const tabs: { id: EditorMode; label: string; icon: typeof Pencil; hint: string }[] = [
    { id: "edit", label: "Source", icon: Pencil, hint: "Edit Markdown source" },
    { id: "split", label: "Split", icon: Table2, hint: "Edit source beside a live preview" },
    { id: "preview", label: "Preview", icon: Eye, hint: "Read the rendered result" },
  ];

  const sourcePane = (
    <section id="mmd-source-pane" aria-label="Markdown source" className="min-w-0 bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-surface-muted/60 px-4 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Source</p>
          <p className="mt-0.5 text-[0.6875rem] text-ink-faint">Markdown and Memoria blocks</p>
        </div>
        <span className="font-mono text-[0.6875rem] text-ink-faint">{value.length.toLocaleString()} chars</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={minRows}
        spellCheck={false}
        aria-label="Markdown source editor"
        className="min-h-80 w-full resize-y bg-surface p-4 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        placeholder="# Untitled\n\nStart writing in Markdown…"
      />
      <MmdBlockMap content={debouncedValue} onSelectLine={jumpToLine} />
      <MmdValidationNotice content={debouncedValue} className="mx-4 mb-4" />
    </section>
  );

  const previewPane = (
    <section id="mmd-preview-pane" aria-label="Rendered preview" className="min-w-0 border-t border-line bg-surface-raised lg:border-s-0 lg:border-t-0">
      <div className="border-b border-line bg-surface-muted/60 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Preview</p>
        <p className="mt-0.5 text-[0.6875rem] text-ink-faint">What your reader will see</p>
      </div>
      <div className="min-h-80 max-h-[42rem] overflow-y-auto p-4 sm:p-6">
        {value.trim() ? <MarkdownRenderer content={value} onReplaceBlock={(raw, replacement) => onChange(value.replace(raw, replacement))} /> : <p className="text-sm text-ink-faint">Nothing to preview yet.</p>}
      </div>
    </section>
  );

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-panel border border-line bg-surface shadow-card", className)}>
      <div className="border-b border-line bg-surface-muted/35 p-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1" aria-label="Editor tools">
            <span className="px-1 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">Text</span>
            {textTools.map(({ icon: Icon, label, action }) => <Tooltip key={label} content={label}><button type="button" aria-label={label} onClick={action} disabled={mode === "preview"} className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-40"><Icon className="h-4 w-4" aria-hidden="true" /></button></Tooltip>)}
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <span className="px-1 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">Structure</span>
            {structureTools.map(({ icon: Icon, label, action }) => <Tooltip key={label} content={label}><button type="button" aria-label={label} onClick={action} disabled={mode === "preview"} className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-40"><Icon className="h-4 w-4" aria-hidden="true" /></button></Tooltip>)}
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <MmdInsertMenu onInsert={insertMmdBlock} disabled={mode === "preview"} />
            <MmdDiagramPicker onInsert={appendDiagram} disabled={mode === "preview"} />
            <MmdStyleMenu onInsert={insertStyledCard} disabled={mode === "preview"} />
            <Tooltip content="Formatting guide"><button type="button" aria-label="Formatting guide" onClick={() => setShowGuide((current) => !current)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-control", showGuide ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:bg-ink/5 hover:text-ink")}><HelpCircle className="h-4 w-4" aria-hidden="true" /></button></Tooltip>
          </div>
          <div className="flex shrink-0 rounded-control border border-line bg-surface p-0.5" role="tablist" aria-label="Editor view">
            {tabs.map(({ id, label, icon: Icon, hint }) => <button key={id} type="button" role="tab" aria-selected={mode === id} aria-controls={id === "preview" ? "mmd-preview-pane" : "mmd-source-pane"} title={hint} onClick={() => setMode(id)} className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-semibold transition-colors", mode === id ? "bg-surface-raised text-ink shadow-sm" : "text-ink-faint hover:text-ink")}><Icon className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">{label}</span></button>)}
          </div>
        </div>
      </div>

      {showGuide && (
        <div className="border-b border-line bg-accent-soft/20 px-4 py-4 text-xs text-ink-soft sm:px-5">
          <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-ink">Write in layers</p><p className="mt-1 max-w-2xl leading-relaxed">Use Markdown for the flow of ideas, then add Memoria blocks for emphasis, structure, visuals, and study cues.</p></div><button type="button" onClick={() => setShowGuide(false)} className="text-ink-faint hover:text-ink" aria-label="Close formatting guide">Close</button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><p><code className="rounded bg-surface px-1"># Heading</code> creates hierarchy</p><p><code className="rounded bg-surface px-1">**bold**</code> marks emphasis</p><p><code className="rounded bg-surface px-1">&gt; note</code> creates a quote</p><p><code className="rounded bg-surface px-1">| table |</code> organizes comparisons</p><p><code className="rounded bg-surface px-1">:::note</code> adds a callout</p><p><code className="rounded bg-surface px-1">:::details</code> hides depth until needed</p></div>
          <button type="button" onClick={() => setShowFullMmdReference((current) => !current)} className="mt-4 font-semibold text-accent-dark underline-offset-2 hover:underline">{showFullMmdReference ? "Hide" : "Show"} the complete Memoria Markdown reference</button>
          {showFullMmdReference && <div className="mt-3 border-t border-line/60 pt-3"><MmdReferenceGuide /></div>}
        </div>
      )}

      {mode === "edit" && sourcePane}
      {mode === "preview" && previewPane}
      {mode === "split" && <div className="grid min-w-0 lg:grid-cols-2">{sourcePane}{previewPane}</div>}
    </div>
  );
}
