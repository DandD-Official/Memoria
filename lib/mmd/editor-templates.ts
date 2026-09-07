import { getSupportedBlockNames } from "@/lib/mmd/spec-blocks";

/**
 * How the editor's Insert menu turns a click into MMD source text. Kept
 * separate from lib/mmd/spec-blocks.ts on purpose: spec-blocks.ts is the
 * parser/validation source of truth (attribute names, required-ness),
 * while this file is UI copy (friendly placeholder text). Mixing them
 * would make the parser schema harder to read for no benefit.
 *
 * Synchronization is still enforced, just the other direction: every key
 * in BLOCK_DEFS must have a template here, and vice versa — see the
 * `getMissingTemplates()` check used by tests/mmd-editor-templates.test.ts
 * and by the insert menu itself (a block with no template simply won't
 * render a menu item rather than inserting broken syntax).
 */
export interface InsertTemplate {
  /** True if this block type can't actually be used yet (e.g. diagrams —
   * there's no diagram editor/storage to reference). The menu item still
   * shows, disabled, with `disabledReason` as an explanatory tooltip,
   * rather than hiding the feature entirely or pretending it works. */
  disabled?: boolean;
  disabledReason?: string;
  /** Mirrors the `transform(selected)` signature MarkdownEditor's
   * existing toolbar buttons already use (components/markdown/editor.tsx
   * `applyEdit`). Receives the current text selection (often empty) and
   * returns the full block to insert, WITHOUT a leading newline (the
   * caller's `{ block: true }` option already guarantees the insertion
   * point starts on its own line) but WITH a trailing newline so
   * whatever follows isn't jammed against the closing fence. */
  build: (selected: string) => string;
}

function fence(name: string, attrs: string, body: string): string {
  const attrPart = attrs ? `{${attrs}}` : "";
  return `:::${name}${attrPart}\n${body}\n:::\n`;
}

export const INSERT_TEMPLATES: Record<string, InsertTemplate> = {
  note: { build: (s) => fence("note", "", s || "Write your note here.") },
  tip: { build: (s) => fence("tip", "", s || "Write a helpful tip here.") },
  warning: {
    build: (s) => fence("warning", `title="Important"`, s || "Write your warning here."),
  },
  danger: {
    build: (s) => fence("danger", "", s || "Write critical information here."),
  },
  info: { build: (s) => fence("info", "", s || "Write general information here.") },
  success: { build: (s) => fence("success", "", s || "Describe the positive outcome here.") },

  definition: {
    build: (s) => fence("definition", `term="Term"`, s || "Definition of the term."),
  },
  "key-concept": {
    build: (s) => fence("key-concept", "", s || "State the key concept here."),
  },
  example: {
    build: (s) => fence("example", `title="Example"`, s || "Walk through the example here."),
  },
  important: {
    build: (s) => fence("important", "", s || "This is important to remember."),
  },
  summary: {
    build: (s) => fence("summary", "", s || "Summarize the section here."),
  },

  section: {
    build: (s) => fence("section", `title="Section Title"`, s || "Section content goes here."),
  },
  card: {
    build: (s) => fence("card", `title="Card Title"`, s || "Card content goes here."),
  },
  columns: {
    build: () =>
      [
        ":::columns",
        ":::column",
        "Left content.",
        ":::",
        ":::column",
        "Right content.",
        ":::",
        ":::",
        "",
      ].join("\n"),
  },
  column: {
    // Not directly insertable on its own — only meaningful inside
    // :::columns, which inserts its own column pair above. No menu item
    // is rendered for this (see insert-menu.tsx), but a template still
    // exists so the every-block-has-a-template invariant holds.
    disabled: true,
    disabledReason: "Inserted automatically as part of Columns.",
    build: (s) => fence("column", "", s || "Column content."),
  },

  image: {
    build: (s) => fence("image", `src="https://" alt="${s || "Describe the image"}"`, ""),
  },
  gallery: {
    build: () =>
      [
        ":::gallery",
        ':::image{src="https://" alt="Describe the first image"}',
        ":::",
        ':::image{src="https://" alt="Describe the second image"}',
        ":::",
        ":::",
        "",
      ].join("\n"),
  },

  diagram: {
    build: (s) => fence("diagram", `id="your-diagram-id" caption="${s || "Diagram"}"`, ""),
  },

  "image-request": {
    build: (s) =>
      fence(
        "image-request",
        `purpose="${s || "Describe what the image should show"}" alt="Describe the image for screen readers"`,
        ""
      ),
  },

  details: {
    build: (s) => fence("details", `title="Click to reveal"`, s || "Hidden content goes here."),
  },
};

/** Block names present in one of BLOCK_DEFS / INSERT_TEMPLATES but not
 * the other. Used by tests/mmd-editor-templates.test.ts to catch drift
 * between the parser's schema and the editor's insert menu — see the
 * module doc comment above. */
export function getMissingTemplates(): { missingTemplate: string[]; missingBlockDef: string[] } {
  const blockNames = new Set(getSupportedBlockNames());
  const templateNames = new Set(Object.keys(INSERT_TEMPLATES));
  return {
    missingTemplate: [...blockNames].filter((n) => !templateNames.has(n)),
    missingBlockDef: [...templateNames].filter((n) => !blockNames.has(n)),
  };
}
