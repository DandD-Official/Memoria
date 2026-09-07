import { MMD_VERSION, type MmdDocument, type MmdNode, type MmdErrorNode } from "@/lib/mmd/ast";
import { BLOCK_DEFS, type BlockDefinition } from "@/lib/mmd/spec-blocks";

/**
 * Memoria Markdown parser. See .context/mmd-spec.md for the specification
 * this implements, and .context/project-architecture.md for why parsing
 * is centralized here rather than scattered through components.
 *
 * Design: a two-phase parse.
 *
 * Phase 1 (tokenize): a stack-based, line-oriented scan that finds
 * matching ":::name{...}" / ":::" fence pairs using LIFO matching (a bare
 * closing fence always closes the most recently opened block), producing
 * a raw tree that knows nothing about which block names are valid or what
 * their nesting rules are. This phase is what makes "an unterminated
 * block does not swallow a later, correctly-opened-and-closed sibling
 * block" true by construction (see mmd-spec.md §7) — the recursive
 * descent naturally attributes each closing fence to its own frame.
 *
 * Phase 2 (postprocess): walks the raw tree applying each block's
 * ChildPolicy from spec-blocks.ts — validating attributes, enforcing
 * nesting depth/allow-lists, and converting anything invalid into an
 * MmdErrorNode that still carries the original source text (content is
 * never dropped, per mmd-spec.md §7).
 *
 * Never throws. A string with zero ":::" fences parses to exactly one
 * markdown text node (byte-for-byte backward compatible with today's
 * plain-Markdown notes/reviewers).
 */

const OPEN_FENCE_RE = /^:::([a-z][a-z0-9-]*)\s*(\{.*\})?\s*$/;
const CLOSE_FENCE_RE = /^:::\s*$/;
const ATTR_PAIR_RE = /([a-zA-Z][\w-]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;

// ---------------------------------------------------------------------
// Phase 1 — raw tokenizer
// ---------------------------------------------------------------------

type RawNode = RawTextNode | RawBlockNode;

interface RawTextNode {
  kind: "text";
  content: string;
}

interface RawBlockNode {
  kind: "block";
  name: string;
  attrsRaw: string; // the "{...}" portion, braces included, or "" if none
  bodyLines: string[];
  children: RawNode[];
  closed: boolean;
  raw: string;
}

interface Cursor {
  i: number;
}

function tokenize(lines: string[], cursor: Cursor, isRoot: boolean): RawNode[] {
  const nodes: RawNode[] = [];
  let textLines: string[] = [];

  const flushText = () => {
    if (textLines.length > 0) {
      nodes.push({ kind: "text", content: textLines.join("\n") });
      textLines = [];
    }
  };

  while (cursor.i < lines.length) {
    const line = lines[cursor.i];
    const openMatch = OPEN_FENCE_RE.exec(line);

    if (openMatch) {
      flushText();
      const name = openMatch[1];
      const attrsRaw = openMatch[2] ?? "";
      const openLineIndex = cursor.i;
      cursor.i += 1;
      const bodyStart = cursor.i;
      const children = tokenize(lines, cursor, false);

      let closed = false;
      let closeLineIndex = -1;
      if (cursor.i < lines.length && CLOSE_FENCE_RE.test(lines[cursor.i])) {
        closed = true;
        closeLineIndex = cursor.i;
        cursor.i += 1;
      }

      const bodyEnd = closed ? closeLineIndex : cursor.i;
      const bodyLines = lines.slice(bodyStart, bodyEnd);
      const rawEnd = closed ? closeLineIndex + 1 : cursor.i;
      const raw = lines.slice(openLineIndex, rawEnd).join("\n");

      nodes.push({ kind: "block", name, attrsRaw, bodyLines, children, closed, raw });
      continue;
    }

    if (!isRoot && CLOSE_FENCE_RE.test(line)) {
      // Belongs to the enclosing block's frame — stop without consuming.
      break;
    }

    textLines.push(line);
    cursor.i += 1;
  }

  flushText();
  return nodes;
}

// ---------------------------------------------------------------------
// Phase 2 — attribute parsing + policy-driven postprocessing
// ---------------------------------------------------------------------

function parseAttrsRaw(attrsRaw: string): Record<string, string> {
  const inner = attrsRaw.replace(/^\{/, "").replace(/\}$/, "");
  const out: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_PAIR_RE.lastIndex = 0;
  while ((match = ATTR_PAIR_RE.exec(inner)) !== null) {
    const [, key, rawValue] = match;
    out[key] = rawValue.replace(/\\(.)/g, "$1");
  }
  return out;
}

function validateAttrs(
  def: BlockDefinition,
  rawAttrs: Record<string, string>
): { attrs: Record<string, string>; missing: string[] } {
  const attrs: Record<string, string> = {};
  const missing: string[] = [];

  for (const [key, schema] of Object.entries(def.attrs)) {
    const value = rawAttrs[key];
    if (value === undefined) {
      if (def.requiredAttrs.includes(key)) missing.push(key);
      continue;
    }
    const result = schema.safeParse(value);
    if (result.success) {
      attrs[key] = result.data as string;
    } else if (def.requiredAttrs.includes(key)) {
      missing.push(key);
    }
    // Invalid optional attributes are silently dropped rather than
    // failing the whole block — fail-safe per mmd-spec.md §5.
  }
  // Unknown attributes (not in def.attrs at all) are intentionally
  // ignored here — dropped, not fatal, per mmd-spec.md §5.

  return { attrs, missing };
}

function errorNode(reason: string, raw: string): MmdErrorNode {
  return { type: "mmd-error", reason, raw };
}

function joinNonEmpty(lines: string[]): string {
  return lines.join("\n");
}

function postprocess(node: RawNode, depth: number): MmdNode {
  if (node.kind === "text") {
    return { type: "markdown", content: node.content };
  }

  if (!node.closed) {
    return errorNode(`Missing closing marker for :::${node.name}`, node.raw);
  }

  const def = BLOCK_DEFS[node.name];
  if (!def) {
    return errorNode(`Unknown block type: ${node.name}`, node.raw);
  }

  const rawAttrs = parseAttrsRaw(node.attrsRaw);
  const { attrs, missing } = validateAttrs(def, rawAttrs);
  if (missing.length > 0) {
    return errorNode(
      `Missing required attribute(s) for :::${node.name}: ${missing.join(", ")}`,
      node.raw
    );
  }

  const policy = def.childPolicy;

  if (policy.kind === "leaf") {
    const text = joinNonEmpty(node.bodyLines);
    const children: MmdNode[] = text.trim().length > 0 ? [{ type: "markdown", content: text }] : [];
    return { type: "block", block: node.name, attrs, children, raw: node.raw };
  }

  if (policy.kind === "empty") {
    const text = joinNonEmpty(node.bodyLines);
    const children: MmdNode[] = text.trim().length > 0 ? [{ type: "markdown", content: text }] : [];
    return { type: "block", block: node.name, attrs, children, raw: node.raw };
  }

  if (policy.kind === "restricted") {
    const children: MmdNode[] = node.children.map((child) => {
      if (child.kind === "text") return { type: "markdown", content: child.content };
      if (!policy.allow.includes(child.name)) {
        return errorNode(
          `:::${node.name} cannot contain a nested :::${child.name} block`,
          child.raw
        );
      }
      // Allowed nested block: process it, but only one level deep — its
      // own further-nested children are flattened by its own policy as
      // usual (most restricted-allow children are themselves "leaf").
      return postprocess(child, depth + 1);
    });
    return { type: "block", block: node.name, attrs, children, raw: node.raw };
  }

  if (policy.kind === "container") {
    if (depth + 1 > policy.maxDepth) {
      return errorNode(
        `Maximum nesting depth exceeded inside :::${node.name}`,
        node.raw
      );
    }
    const children: MmdNode[] = node.children.map((child) => {
      if (child.kind === "text") return { type: "markdown", content: child.content };
      if (policy.disallow?.includes(child.name)) {
        return errorNode(
          `:::${node.name} cannot contain a nested :::${child.name} block`,
          child.raw
        );
      }
      return postprocess(child, depth + 1);
    });
    return { type: "block", block: node.name, attrs, children, raw: node.raw };
  }

  // policy.kind === "only"
  const processedChildren: MmdNode[] = node.children.map((child) => {
    if (child.kind === "text") return { type: "markdown", content: child.content };
    if (!policy.allow.includes(child.name)) {
      return errorNode(`:::${node.name} may only contain: ${policy.allow.join(", ")}`, child.raw);
    }
    return postprocess(child, depth + 1);
  });

  const isValid = processedChildren.every((child) => {
    if (child.type === "markdown") return child.content.trim().length === 0;
    if (child.type === "block") return policy.allow.includes(child.block);
    return false;
  });

  if (!isValid) {
    return errorNode(`:::${node.name} may only contain: ${policy.allow.join(", ")}`, node.raw);
  }

  return { type: "block", block: node.name, attrs, children: processedChildren, raw: node.raw };
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

export function parseMmd(source: string): MmdDocument {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const cursor: Cursor = { i: 0 };
  const rawNodes = tokenize(lines, cursor, true);
  const children = rawNodes.map((node) => postprocess(node, 0));
  return { mmdVersion: MMD_VERSION, children };
}

/** Walks a parsed document collecting every mmd-error node, depth-first,
 * for editor diagnostics (Milestone 15) or test assertions. */
export function collectMmdErrors(doc: MmdDocument): MmdErrorNode[] {
  const errors: MmdErrorNode[] = [];
  const walk = (nodes: MmdNode[]) => {
    for (const node of nodes) {
      if (node.type === "mmd-error") errors.push(node);
      else if (node.type === "block") walk(node.children);
    }
  };
  walk(doc.children);
  return errors;
}

/** True if the source contains no MMD fence syntax at all — i.e. it is
 * (and will parse as) plain Markdown. Useful for call sites that want to
 * skip the MMD renderer entirely for the common case. */
export function isPlainMarkdown(source: string): boolean {
  return !/^:::[a-z][a-z0-9-]*\s*(\{.*\})?\s*$/m.test(source);
}
