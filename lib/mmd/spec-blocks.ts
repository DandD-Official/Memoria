import { z } from "zod";
import { MMD_VERSION } from "@/lib/mmd/ast";

export { MMD_VERSION };

/**
 * Single source of truth for every supported MMD block: its attribute
 * schema and its nesting policy. The parser (lib/mmd/parser.ts), the
 * future AI instruction generator (lib/mmd/ai-instructions.ts), and the
 * editor's insert menu must all read from this file rather than
 * hand-maintaining their own copy of "the list of blocks" — see
 * .context/ai-content-generation.md for why this matters.
 */

/** A string attribute value, rejected if it looks like it could carry
 * markup or an executable URL scheme. Applied to every free-text
 * attribute regardless of block — belt-and-suspenders on top of the
 * renderer never interpreting attributes as HTML.
 *
 * `min` defaults to 1 (not 0): an attribute written as `key=""` is
 * present-but-empty, which for a REQUIRED attribute (term, id, src, alt,
 * purpose, title on section) is exactly as useless as omitting it
 * entirely — both should fail validation the same way. Pass `min: 0`
 * explicitly for attributes where an empty string is meaningfully
 * different from absent (none currently need this). */
function safeString(max = 500, min = 1) {
  return z
    .string()
    .min(min, min > 0 ? "must not be empty" : undefined)
    .max(max, `must be ${max} characters or fewer`)
    .refine((v) => !/[<>]/.test(v), "must not contain < or >")
    .refine((v) => !/javascript:/i.test(v), "must not contain a javascript: URL")
    .refine((v) => !/^data:/i.test(v), "must not be a data: URL");
}

export type ChildPolicy =
  /** No nested MMD blocks are recognized in the body; the entire body is
   * kept as a single Markdown text node, even if it happens to contain
   * text that looks like a ":::name" fence (per mmd-spec.md §6). */
  | { kind: "leaf" }
  /** Body should be empty between the fences (image/diagram/image-request
   * carry everything in attributes). If non-whitespace content is present
   * it is kept as a trailing Markdown node rather than discarded — but the
   * block is still considered valid, since the spec doesn't require
   * enforcing an empty body as a hard parse error. */
  | { kind: "empty" }
  /** Only the listed block names may nest directly inside, one level deep
   * (their own children are not further recursed as blocks — flattened to
   * a text node — even if that nested block type would normally allow
   * further nesting). Anything else nested here becomes an mmd-error. */
  | { kind: "restricted"; allow: string[] }
  /** Any block type may nest, recursively, up to maxDepth total MMD
   * nesting levels from the document root. `disallow` optionally excludes
   * specific block names even though nesting is otherwise open (e.g. a
   * "column" cannot contain another "columns"). */
  | { kind: "container"; maxDepth: number; disallow?: string[] }
  /** The body must consist ONLY of the listed block names (plus
   * whitespace) — any other content (another block type, or non-blank
   * Markdown text) invalidates the ENTIRE block, which becomes a single
   * mmd-error preserving the raw source (per mmd-spec.md §7). */
  | { kind: "only"; allow: string[]; maxDepth: number };

export interface BlockDefinition {
  name: string;
  category: "callout" | "educational" | "layout" | "media" | "diagram" | "ai";
  /** One-line description reused by the AI prompt and the editor's insert
   * menu tooltip — see .context/ai-content-generation.md. */
  description: string;
  attrs: Record<string, z.ZodTypeAny>;
  requiredAttrs: string[];
  childPolicy: ChildPolicy;
}

const CALLOUT_NAMES = ["note", "tip", "warning", "danger", "info", "success"] as const;
const CALLOUT_CHILD_POLICY: ChildPolicy = {
  kind: "restricted",
  allow: ["definition", "key-concept", "example", "important", "summary"],
};

const CALLOUT_DESCRIPTIONS: Record<(typeof CALLOUT_NAMES)[number], string> = {
  note: "Useful additional information that isn't essential.",
  tip: "Helpful advice or a shortcut.",
  warning: "Something the reader should be careful about.",
  danger: "Critical information — mistakes here have serious consequences.",
  info: "General, neutral supporting information.",
  success: "A positive outcome, correct result, or completed step.",
};

function calloutDefs(): Record<string, BlockDefinition> {
  const out: Record<string, BlockDefinition> = {};
  for (const name of CALLOUT_NAMES) {
    out[name] = {
      name,
      category: "callout",
      description: CALLOUT_DESCRIPTIONS[name],
      attrs: { title: safeString(200).optional() },
      requiredAttrs: [],
      childPolicy: CALLOUT_CHILD_POLICY,
    };
  }
  return out;
}

export const BLOCK_DEFS: Record<string, BlockDefinition> = {
  ...calloutDefs(),

  // Educational blocks — leaf bodies (plain Markdown only, no further nesting).
  definition: {
    name: "definition",
    category: "educational",
    description: "Defines a single term. Requires `term`.",
    attrs: { term: safeString(200) },
    requiredAttrs: ["term"],
    childPolicy: { kind: "leaf" },
  },
  "key-concept": {
    name: "key-concept",
    category: "educational",
    description: "Flags an idea that is central to the topic.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "leaf" },
  },
  example: {
    name: "example",
    category: "educational",
    description: "A worked example illustrating a concept.",
    attrs: { title: safeString(200).optional() },
    requiredAttrs: [],
    childPolicy: { kind: "leaf" },
  },
  important: {
    name: "important",
    category: "educational",
    description: "Content that frequently appears in exams or is easy to forget.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "leaf" },
  },
  summary: {
    name: "summary",
    category: "educational",
    description: "A short recap of the preceding section.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "leaf" },
  },
  math: {
    name: "math",
    category: "educational",
    description: "Renders a safe LaTeX-style mathematical expression, including arrows such as \\rightarrow.",
    attrs: { formula: safeString(1000) },
    requiredAttrs: ["formula"],
    childPolicy: { kind: "empty" },
  },

  // Layout
  section: {
    name: "section",
    category: "layout",
    description: "A titled section that may contain any other supported block.",
    attrs: { title: safeString(200), subtitle: safeString(200).optional() },
    requiredAttrs: ["title"],
    childPolicy: { kind: "container", maxDepth: 4 },
  },
  card: {
    name: "card",
    category: "layout",
    description: "A reusable content container, optionally titled.",
    attrs: {
      title: safeString(200).optional(),
      subtitle: safeString(200).optional(),
      icon: safeString(100).optional(),
      type: z.enum(["default", "outline", "highlight"]).optional(),
    },
    requiredAttrs: [],
    childPolicy: {
      kind: "restricted",
      allow: ["note", "tip", "warning", "danger", "info", "success", "definition", "example"],
    },
  },
  columns: {
    name: "columns",
    category: "layout",
    description: "A responsive multi-column layout. Must contain only `column` blocks.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "only", allow: ["column"], maxDepth: 4 },
  },
  column: {
    name: "column",
    category: "layout",
    description: "One column inside a `columns` block.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "container", maxDepth: 4, disallow: ["columns"] },
  },
  details: {
    name: "details",
    category: "layout",
    description: "Collapsible content, expanded by default in exports.",
    attrs: { title: safeString(200).optional() },
    requiredAttrs: [],
    childPolicy: { kind: "container", maxDepth: 4 },
  },

  // Media
  image: {
    name: "image",
    category: "media",
    description: "A real uploaded or external image asset, including SVG, with alt text, an optional caption, alignment, and size.",
    attrs: {
      src: safeString(2000),
      alt: safeString(300),
      caption: safeString(300).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      size: z.enum(["small", "medium", "large", "full"]).optional(),
    },
    requiredAttrs: ["src", "alt"],
    childPolicy: { kind: "empty" },
  },
  gallery: {
    name: "gallery",
    category: "media",
    description: "A responsive grid of images. May contain `image` blocks or bare Markdown images.",
    attrs: {},
    requiredAttrs: [],
    childPolicy: { kind: "restricted", allow: ["image"] },
  },

  // Diagram
  diagram: {
    name: "diagram",
    category: "diagram",
    description: "Embeds a diagram by id. The diagram itself is stored and edited separately.",
    attrs: { id: safeString(200), caption: safeString(300).optional() },
    requiredAttrs: ["id"],
    childPolicy: { kind: "empty" },
  },

  // AI image placeholder — never a real image, see mmd-spec.md §4.
  "image-request": {
    name: "image-request",
    category: "ai",
    description: "A request for a user-supplied visual; fulfill it with an uploaded SVG/image or a separately edited diagram. It does not render a visual by itself.",
    attrs: {
      purpose: safeString(1000),
      alt: safeString(300),
      caption: safeString(300).optional(),
      placement: safeString(200).optional(),
    },
    requiredAttrs: ["purpose", "alt"],
    childPolicy: { kind: "empty" },
  },

  // Inline AI/user-authored visual. The body is handled only by the SVG
  // renderer, which sanitizes it before it reaches the DOM.
  svg: {
    name: "svg",
    category: "ai",
    description: "Renders a self-contained, sanitized SVG visual generated by AI or authored by the user.",
    attrs: {
      alt: safeString(300),
      caption: safeString(300).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      size: z.enum(["small", "medium", "large", "full"]).optional(),
    },
    requiredAttrs: ["alt"],
    childPolicy: { kind: "leaf" },
  },
};

export function getBlockDefinition(name: string): BlockDefinition | undefined {
  return BLOCK_DEFS[name];
}

export function getSupportedBlockNames(): string[] {
  return Object.keys(BLOCK_DEFS);
}
