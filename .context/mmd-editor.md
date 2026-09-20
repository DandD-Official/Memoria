# Memoria Markdown editor

The shared public MarkdownEditor props are unchanged. A dynamically loaded CodeMirror 6 surface owns selection, transactions, undo/redo, wrapping, line numbers, search/replace, block folding, indent guides and matching fences. Source/Split/Preview modes keep the source instance mounted to preserve history. Toolbar insertions retain indentation and select a placeholder.

The old block map is removed. Diagnostics are analyzed after 150 ms, underline source ranges, tint error lines, mark the gutter/overview and populate a collapsed Problems drawer. F8/Shift+F8 navigates, Ctrl/Cmd+. opens keyboard-accessible fixes, preview errors jump to source. Save confirmations report errors without gating persistence. Reviewer and guest paste-back previews use the same diagnostics.

Tab/Shift+Tab and mobile Indent/Outdent operate on lines; numbered-list indentation follows marker width. Enter continues lists, indents blocks and inserts missing closers. Smart backspace, electric closing fences, fence-only pairing and spec-derived block/attribute/enum completion are supported. Esc then Tab exits. Mobile Undo/Redo and a shortcuts disclosure are available.

Implementation: grammar.ts, parser.ts, diagnostics.ts, editor-commands.ts, components/mmd/editor/code-editor.tsx. BLOCK_DEFS remains the block/attribute authority. AI output remains flush-left.

Verification and autonomous decisions are recorded in implementation-review.md. Browser interactions and physical mobile/IME behavior require manual verification when a browser is connected.
