import { scanMmd, readFence, dedentBody, type SourcePosition } from "@/lib/mmd/grammar";
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

type RawNode = RawTextNode | RawBlockNode;
interface RawTextNode { kind: "text"; content: string }
interface RawBlockNode { kind: "block"; name: string; attrsRaw: string; bodyLines: string[]; children: RawNode[]; closed: boolean; raw: string; position: SourcePosition; malformed?: boolean }

/** Iterative matching avoids overflowing the JS stack on hostile nesting. */
function tokenize(source: string): RawNode[] {
  const lines = scanMmd(source);
  const root: RawNode[] = [];
  const stack: { node: RawBlockNode; start: number; text: string[] }[] = [];
  let rootText: string[] = [];
  function flush() {
    const frame = stack[stack.length - 1];
    const text = frame ? frame.text : rootText;
    if (text.length) (frame ? frame.node.children : root).push({ kind: "text", content: text.join("\n") });
    if (frame) frame.text = []; else rootText = [];
  }
  function finish(frame: typeof stack[number], end: number, closed: boolean) {
    const node = frame.node;
    node.closed = closed;
    node.position.closeLine = closed ? lines[end].line : null;
    node.position.endOffset = lines[end]?.to ?? source.length;
    node.raw = source.slice(node.position.startOffset, node.position.endOffset);
    const body = lines.slice(frame.start + 1, closed ? end : end + 1).map(line => line.text);
    node.bodyLines = dedentBody(body, node.position.indent, node.name === "code" || node.name === "svg");
    // Dedent direct text only; child fences retain their own absolute indentation.
    const stripped = dedentBody(body, node.position.indent, true);
    const extra = node.name !== "code" && node.name !== "svg" && stripped.some(line => line.trim()) && stripped.every(line => !line.trim() || /^( {2}|\t)/.test(line));
    for (const child of node.children) if (child.kind === "text") {
      child.content = dedentBody(child.content.split("\n"), node.position.indent, true).map(line => extra ? line.replace(/^( {2}|\t)/, "") : line).join("\n");
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind === "open" || line.kind === "malformed") {
      flush();
      const node: RawBlockNode = { kind: "block", name: line.name, attrsRaw: line.attrsRaw, bodyLines: [], children: [], closed: false, raw: line.text, malformed: line.kind === "malformed", position: { openLine: line.line, closeLine: null, startOffset: line.from, endOffset: line.to, indent: line.indent, attributes: line.attributes } };
      (stack.length ? stack[stack.length - 1].node.children : root).push(node);
      if (node.malformed) { node.closed = true; continue; }
      stack.push({ node, start: i, text: [] });
    } else if (line.kind === "close" && stack.length) {
      flush(); finish(stack.pop()!, i, true);
    } else {
      (stack.length ? stack[stack.length - 1].text : rootText).push(line.text);
    }
  }
  flush();
  while (stack.length) finish(stack.pop()!, lines.length - 1, false);
  return root;
}

// ---------------------------------------------------------------------
// Phase 2 — attribute parsing + policy-driven postprocessing
// ---------------------------------------------------------------------

function parseAttrsRaw(attrsRaw: string): Record<string, string> {
  return Object.fromEntries(readFence(":::note" + attrsRaw).attributes.map(attr => [attr.name, attr.value]));
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
  const result = processNode(node, depth);
  if (node.kind === "block") result.position = node.position;
  return result;
}

function processNode(node: RawNode, depth: number): MmdNode {
  if (node.kind === "text") {
    return { type: "markdown", content: node.content };
  }

  if (node.malformed) return errorNode("Malformed fence: use :::name{key=\"value\"}", node.raw);
  if (depth > 8) return errorNode("Maximum nesting depth exceeded", node.raw);
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
  const rawNodes = tokenize(source);
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
  return !scanMmd(source).some(line => line.kind === "open" || line.kind === "malformed");
}
