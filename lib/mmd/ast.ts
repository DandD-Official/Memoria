/**
 * Memoria Markdown (MMD) — Abstract Syntax Tree types.
 *
 * See .context/mmd-spec.md for the full specification these types
 * implement. This file is intentionally dependency-free (no Zod, no
 * React) so it can be imported by the parser, the renderer, and the
 * exporters without pulling in unrelated code.
 */

export const MMD_VERSION = 1 as const;

/** A run of ordinary Markdown (GFM), passed through untouched to the
 * existing react-markdown renderer. Never contains MMD fence syntax —
 * any ":::name" the parser recognized has already been extracted into a
 * sibling MmdBlockNode. */
export interface MmdTextNode {
  type: "markdown";
  content: string;
}

/** A recognized, valid, fully-attribute-checked MMD block. */
export interface MmdBlockNode {
  type: "block";
  /** Block name, e.g. "note", "definition", "columns". Matches a key in
   * BLOCK_DEFS (lib/mmd/spec-blocks.ts). */
  block: string;
  /** Parsed and validated attributes. Only attributes defined on this
   * block's schema are present here — unknown attributes are dropped
   * (non-fatally) during parsing. */
  attrs: Record<string, string>;
  /** Nested content. For "leaf" blocks (definition, image, diagram, ...)
   * this is at most a single MmdTextNode. For container blocks (section,
   * details, columns/column) this may contain any node type, including
   * further MmdBlockNodes, up to the nesting depth limit. */
  children: MmdNode[];
  /** Original source text for this block, fences included. Used by the
   * exporters (which render some blocks as plain text) and for
   * diagnostics. */
  raw: string;
}

/** Anything the parser could not turn into a valid MmdBlockNode:
 * an unknown block name, a missing required attribute, an unterminated
 * block, invalid nesting, etc. Per the spec (§7 fallback behavior), this
 * NEVER causes a parse failure for the rest of the document — content is
 * never dropped, only flagged. */
export interface MmdErrorNode {
  type: "mmd-error";
  reason: string;
  /** Original source text of the offending block/line span, preserved so
   * renderers and exporters can still show something rather than nothing. */
  raw: string;
}

export type MmdNode = MmdTextNode | MmdBlockNode | MmdErrorNode;

export interface MmdDocument {
  mmdVersion: typeof MMD_VERSION;
  children: MmdNode[];
}

export function isBlockNode(node: MmdNode): node is MmdBlockNode {
  return node.type === "block";
}

export function isErrorNode(node: MmdNode): node is MmdErrorNode {
  return node.type === "mmd-error";
}

export function isTextNode(node: MmdNode): node is MmdTextNode {
  return node.type === "markdown";
}
