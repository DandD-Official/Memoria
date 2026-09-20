"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { EditorState, StateEffect, StateField, Prec } from "@codemirror/state";
import { EditorView, Decoration, ViewPlugin, keymap, lineNumbers, highlightActiveLine, drawSelection, type DecorationSet } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import { StreamLanguage, syntaxHighlighting, HighlightStyle, foldGutter, foldService } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { autocompletion, completionKeymap, snippetCompletion, acceptCompletion, completionStatus, nextSnippetField, hasNextSnippetField, type CompletionContext } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { setDiagnostics, lintGutter, openLintPanel, type Diagnostic } from "@codemirror/lint";
import { analyzeMmd, type MmdDiagnostic } from "@/lib/mmd/diagnostics";
import { readFence, scanMmd } from "@/lib/mmd/grammar";
import { BLOCK_DEFS } from "@/lib/mmd/spec-blocks";
import { indentLines, enterEdit, smartBackspace, electricCloser, templateEdit, enumValues, blockCandidates } from "@/lib/mmd/editor-commands";

export interface CodeEditorHandle {
  edit: (transform: (selected: string) => string, block?: boolean) => void;
  jump: (line: number) => void;
  command: (name: "indent" | "outdent" | "undo" | "redo") => void;
}
interface Props { value: string; onChange: (value: string) => void; minRows: number; editorRef: MutableRefObject<CodeEditorHandle | null> }

const decorate = StateEffect.define<DecorationSet>();
const decorations = StateField.define<DecorationSet>({ create: () => Decoration.none, update: (value, tr) => {
  value = value.map(tr.changes);
  for (const effect of tr.effects) if (effect.is(decorate)) value = effect.value;
  return value;
}, provide: field => EditorView.decorations.from(field) });

function fenceDecorations(view: EditorView): DecorationSet {
  const tokens = scanMmd(view.state.doc.toString());
  const stack: number[] = []; const pairs = new Map<number, number>();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === "open") stack.push(i);
    if (tokens[i].kind === "close" && stack.length) { const open = stack.pop()!; pairs.set(open, i); pairs.set(i, open); }
  }
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const partner = pairs.get(cursorLine);
  const marks = [];
  for (const range of view.visibleRanges) for (let i = view.state.doc.lineAt(range.from).number - 1; i < tokens.length && tokens[i].from <= range.to; i++) {
    const token = tokens[i];
    if (token.indent.length) marks.push(Decoration.mark({ class: "mmd-indent-guide" }).range(token.from, token.from + token.indent.length));
    if (partner !== undefined && (i === cursorLine || i === partner)) marks.push(Decoration.mark({ class: "mmd-matching-fence" }).range(token.from + token.indent.length, token.to));
  }
  return Decoration.set(marks, true);
}
const fenceGuides = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = fenceDecorations(view); }
  update(update: import("@codemirror/view").ViewUpdate) { if (update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = fenceDecorations(update.view); }
}, { decorations: value => value.decorations });

const language = StreamLanguage.define({
  startState: () => ({ fence: false }),
  token(stream, state) {
    if (stream.sol()) state.fence = readFence(stream.string).kind !== "text";
    if (stream.eatSpace()) return null;
    if (state.fence) {
      if (stream.match(/:{2,}/)) return "punctuation";
      if (stream.match(/"(?:[^"\\]|\\.)*"/)) return "string";
      if (stream.match(/[\w-]+(?=\s*=)/)) return "propertyName";
      if (stream.match(/[a-z][\w-]*/)) return "typeName";
    }
    if (stream.sol() && stream.match(/#{1,6} .*/)) return "heading";
    if (stream.match(/\*\*[^*]+\*\*/)) return "strong";
    if (stream.match(/\*[^*]+\*/)) return "emphasis";
    if (stream.match(/`[^`]+`/)) return "monospace";
    if (stream.match(/\[[^\]]+\]\([^)]*\)/)) return "link";
    if (stream.match(/(?:[-+*]|\d+\.) |[>|]/)) return "punctuation";
    stream.next(); return null;
  },
});
const highlight = HighlightStyle.define([
  { tag: [tags.typeName, tags.heading], color: "rgb(var(--color-accent-dark))", fontWeight: "600" },
  { tag: tags.propertyName, color: "rgb(var(--color-warning))" },
  { tag: [tags.string, tags.link], color: "rgb(var(--color-accent-dark))" },
  { tag: tags.strong, fontWeight: "700" }, { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, backgroundColor: "rgb(var(--color-surface-muted))" },
  { tag: tags.punctuation, color: "rgb(var(--color-ink-soft))" },
]);
async function complete(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const block = /^[ \t]*:::([\w-]*)$/.exec(before);
  if (block) return { from: context.pos - block[1].length, options: blockCandidates().map(item => snippetCompletion(`${item.label}${item.required.length ? `{${item.required.map((attr, i) => `${attr}="\${${i + 1}:${attr}}"`).join(" ")}}` : ""}\n  \${body}\n:::`, { label: item.label, detail: item.detail, type: "type" })) };
  const opener = /^[ \t]*:::([\w-]+)\{/.exec(before);
  if (!opener) return null;
  const value = /([\w-]+)="([^"\n]*)$/.exec(before);
  if (value) {
    let options = enumValues(opener[1], value[1]).map(label => ({ label, type: "enum" }));
    if (opener[1] === "diagram" && value[1] === "id") {
      try {
        const response = await fetch("/api/diagrams");
        if (response.ok) { const data = await response.json(); options = (Array.isArray(data) ? data : data.diagrams ?? []).map((diagram: { id: string; title: string }) => ({ label: diagram.id, displayLabel: diagram.title, type: "enum" })); }
      } catch { /* Offline editing still works. */ }
    }
    return { from: context.pos - value[2].length, options };
  }
  const word = before.match(/[\w-]*$/)![0];
  return { from: context.pos - word.length, options: Object.keys(BLOCK_DEFS[opener[1]]?.attrs ?? {}).map(label => snippetCompletion(`${label}="\${value}"`, { label, type: "property" })) };
}
function indent(view: EditorView, outdent = false) {
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: indentLines(view.state.doc.toString(), from, to, outdent), userEvent: "input.indent" }); return true;
}

export default function CodeEditor({ value, onChange, minRows, editorRef }: Props) {
  const host = useRef<HTMLDivElement>(null); const viewRef = useRef<EditorView>();
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const [problems, setProblems] = useState<MmdDiagnostic[]>([]);
  const [position, setPosition] = useState({ line: 1, col: 1 });
  const [showProblems, setShowProblems] = useState(false);
  const [hint, setHint] = useState(true);
  const [shortcuts, setShortcuts] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let timeout: ReturnType<typeof setTimeout>;
    let currentProblems: MmdDiagnostic[] = [];
    let escapeTab = false;
    const jump = (at: number) => { view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: "center" }) }); view.focus(); };
    const next = (backwards = false) => {
      if (!currentProblems.length) return false;
      const at = view.state.selection.main.head;
      const item = backwards ? [...currentProblems].reverse().find(item => item.from < at) ?? currentProblems.at(-1)! : currentProblems.find(item => item.from > at) ?? currentProblems[0];
      jump(item.from); setShowProblems(true); return true;
    };
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentProblems = analyzeMmd(view.state.doc.toString()); setProblems(currentProblems);
        const lint: Diagnostic[] = currentProblems.map(item => ({ from: item.from, to: item.to, severity: item.severity, message: `${item.message} (${item.code})`, actions: item.fixes?.map(fix => ({ name: fix.label, apply: target => target.dispatch({ changes: fix.changes, userEvent: "input" }) })) }));
        const seen = new Set<number>();
        const marks = currentProblems.filter(item => item.severity === "error").flatMap(item => {
          const at = view.state.doc.lineAt(item.from).from;
          if (seen.has(at)) return []; seen.add(at);
          return [Decoration.line({ class: "mmd-error-line" }).range(at)];
        });
        view.dispatch(setDiagnostics(view.state, lint), { effects: decorate.of(Decoration.set(marks, true)) });
      }, 150);
    };
    const view: EditorView = new EditorView({ parent: host.current, state: EditorState.create({ doc: value, extensions: [
      lineNumbers(), history(), drawSelection(), highlightActiveLine(), highlightSelectionMatches(), language, syntaxHighlighting(highlight), decorations, fenceGuides,
      foldGutter(), foldService.of((state, start) => {
        const tokens = scanMmd(state.doc.toString()); const index = tokens.findIndex(line => line.from === start && line.kind === "open");
        if (index < 0) return null;
        let depth = 1;
        for (let i = index + 1; i < tokens.length; i++) {
          if (tokens[i].kind === "open") depth++;
          if (tokens[i].kind === "close" && --depth === 0) return { from: tokens[index].to, to: tokens[i].to };
        }
        return null;
      }),
      lintGutter(), autocompletion({ override: [complete] }), EditorView.lineWrapping,
      Prec.highest(keymap.of([
        { key: "Escape", run: () => { escapeTab = true; return false; } },
        { key: "Tab", run: target => { if (escapeTab) { escapeTab = false; return false; } if (hasNextSnippetField(target.state)) return nextSnippetField(target); if (completionStatus(target.state) === "active") return acceptCompletion(target); return indent(target); } },
        { key: "Shift-Tab", run: target => escapeTab ? false : indent(target, true) },
        { key: "Mod-]", run: target => indent(target) }, { key: "Mod-[", run: target => indent(target, true) },
        { key: "F8", run: () => next() }, { key: "Shift-F8", run: () => next(true) },
        { key: "Mod-.", run: () => { setShowProblems(true); return openLintPanel(view); } },
        { key: "Enter", run: target => { if (completionStatus(target.state) === "active") return acceptCompletion(target); const { from, to } = target.state.selection.main; const edit = enterEdit(target.state.doc.toString(), from, to); target.dispatch({ changes: edit.changes, selection: { anchor: edit.anchor }, userEvent: "input" }); return true; } },
        { key: "Backspace", run: target => { const { from, to } = target.state.selection.main; const change = from === to && smartBackspace(target.state.doc.toString(), from); if (!change) return false; target.dispatch({ changes: change, userEvent: "delete.backward" }); return true; } },
      ])), keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.inputHandler.of((target, from, to, text) => {
        const source = target.state.doc.toString(); const line = target.state.doc.lineAt(from);
        if (text === ":") {
          const change = electricCloser(source.slice(0, from) + text + source.slice(to), from + 1);
          if (change) { target.dispatch({ changes: { ...change, to }, selection: { anchor: change.from + change.insert.length }, userEvent: "input.type" }); return true; }
        }
        if ((text === "{" || text === '"') && readFence(line.text).kind !== "text") {
          target.dispatch({ changes: { from, to, insert: text + (text === "{" ? "}" : '"') }, selection: { anchor: from + 1 }, userEvent: "input.type" }); return true;
        }
        return false;
      }),
      EditorView.updateListener.of(update => {
        if (update.docChanged) { changeRef.current(update.state.doc.toString()); refresh(); }
        if (update.selectionSet || update.docChanged) { const head = update.state.selection.main.head; const line = update.state.doc.lineAt(head); setPosition({ line: line.number, col: head - line.from + 1 }); }
      }),
      EditorView.contentAttributes.of({ "aria-label": "Markdown source editor", spellcheck: "false" }),
      EditorView.theme({
        "&": { color: "rgb(var(--color-ink))", backgroundColor: "rgb(var(--color-surface))", minHeight: `${minRows * 24}px`, maxWidth: "100%" },
        "&.cm-focused": { outline: "2px solid rgb(var(--color-accent-dark))", outlineOffset: "-2px" },
        ".cm-scroller": { fontFamily: "var(--font-mono), monospace", overflow: "auto", maxHeight: "42rem" },
        ".cm-content": { padding: "16px 0", overflowWrap: "anywhere", fontSize: "16px" },
        ".cm-line": { padding: "0 12px" }, ".cm-cursor": { borderLeftColor: "rgb(var(--color-ink))" },
        ".cm-gutters": { backgroundColor: "rgb(var(--color-surface-muted))", color: "rgb(var(--color-ink-faint))", borderColor: "rgb(var(--color-line))" },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgb(var(--color-accent-soft) / .35)" },
        ".mmd-error-line": { backgroundColor: "rgb(var(--color-danger) / .07)" },
        ".mmd-indent-guide": { backgroundImage: "repeating-linear-gradient(to right, rgb(var(--color-line)) 0 1px, transparent 1px 2ch)" },
        ".mmd-matching-fence": { backgroundColor: "rgb(var(--color-accent-soft))", outline: "1px solid rgb(var(--color-accent-dark))" },
        ".cm-tooltip, .cm-panels": { backgroundColor: "rgb(var(--color-surface-raised))", color: "rgb(var(--color-ink))", borderColor: "rgb(var(--color-line))" },
        ".cm-diagnostic-error": { borderColor: "rgb(var(--color-danger))" },
        ".cm-diagnostic-warning": { borderColor: "rgb(var(--color-warning))" },
        ".cm-lintRange-error": { textDecoration: "underline wavy rgb(var(--color-danger))", backgroundImage: "none" },
        ".cm-lintRange-warning": { textDecoration: "underline wavy rgb(var(--color-warning))", backgroundImage: "none" },
        ".cm-lintRange-info": { textDecoration: "underline dotted rgb(var(--color-ink-faint))" },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { background: "rgb(var(--color-accent) / .4)" },
        ".cm-button, .cm-diagnosticAction": { minHeight: "44px", color: "inherit", background: "rgb(var(--color-surface-muted))" },
      }),
    ] }) });
    viewRef.current = view; refresh();
    editorRef.current = {
      edit(transform, block) { const { from, to } = view.state.selection.main; const edit = templateEdit(view.state.doc.toString(), from, to, transform(view.state.sliceDoc(from, to)), block); view.dispatch({ ...edit, userEvent: "input" }); view.focus(); },
      jump(line) { jump(view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines))).from); },
      command(name) { if (name === "undo") undo(view); else if (name === "redo") redo(view); else indent(view, name === "outdent"); view.focus(); },
    };
    return () => { clearTimeout(timeout); editorRef.current = null; viewRef.current = undefined; view.destroy(); };
    // The editor owns its history; prop changes are synchronized below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const view = viewRef.current; if (view && value !== view.state.doc.toString()) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }); }, [value]);
  const errors = problems.filter(item => item.severity === "error").length;
  const warnings = problems.filter(item => item.severity === "warning").length;
  return <div className="min-w-0">
    <div className="relative min-w-0 overflow-hidden"><div ref={host} />
      <div className="absolute inset-y-0 right-0 w-2" aria-hidden="true">{problems.map((problem, i) => <span key={i} className={`absolute h-1 w-full ${problem.severity === "error" ? "bg-danger" : "bg-warning"}`} style={{ top: `${100 * problem.from / Math.max(1, value.length)}%` }} />)}</div>
    </div>
    <div className="flex flex-wrap items-center gap-x-3 border-t border-line px-3 text-xs text-ink-soft">
      <button type="button" className="min-h-11" aria-expanded={showProblems} onClick={() => setShowProblems(!showProblems)}>× {errors} errors · △ {warnings} warnings</button>
      <span className="tabular-nums">Ln {position.line}, Col {position.col} · Spaces: 2</span>
      <button type="button" className="min-h-11 underline" onClick={() => setShortcuts(!shortcuts)} aria-expanded={shortcuts}>Shortcuts</button>
    </div>
    {hint && <div className="flex items-center gap-2 border-t border-line px-3 text-xs text-ink-soft"><p className="flex-1">Type ::: for blocks · Tab to indent · F8 jumps to problems</p><button type="button" className="min-h-11 min-w-11" aria-label="Dismiss editor hint" onClick={() => setHint(false)}>×</button></div>}
    {shortcuts && <p className="border-t border-line p-3 text-xs leading-relaxed text-ink-soft">Esc then Tab leaves the editor. Ctrl/Cmd+F finds text. Ctrl/Cmd+Z undoes. Ctrl/Cmd+[ or ] changes indentation. F8 / Shift+F8 moves between problems. Ctrl/Cmd+. opens fixes.</p>}
    {showProblems && <div className="max-h-60 overflow-auto border-t border-line p-2" aria-label="Problems">
      {!problems.length && <p className="p-2 text-sm text-ink-soft">No source problems.</p>}
      {problems.map((item, i) => <div key={i} className="border-b border-line py-1 text-sm">
        <button type="button" className="min-h-11 w-full break-words px-2 text-left text-ink" onClick={() => editorRef.current?.jump(item.line)}>{item.line}:{item.col} — {item.message} <span className="text-xs text-ink-faint">{item.severity}</span></button>
        {item.fixes?.map(fix => <button type="button" key={fix.label} className="min-h-11 px-2 text-accent-dark underline" onClick={() => viewRef.current?.dispatch({ changes: fix.changes, userEvent: "input" })}>{fix.label}</button>)}
      </div>)}
    </div>}
  </div>;
}
