/** Shared, DOM-free lexical grammar. Offsets always address the original string. */
export const INDENT_UNIT = 2;
export interface AttributeSpan { name: string; value: string; from: number; to: number; nameFrom: number; nameTo: number; valueFrom: number; valueTo: number }
export interface SourcePosition { openLine: number; closeLine: number | null; startOffset: number; endOffset: number; indent: string; attributes: AttributeSpan[] }
export interface FenceLine {
  text: string; from: number; to: number; line: number; indent: string;
  kind: "text" | "open" | "close" | "malformed";
  name: string; attrsRaw: string; attributes: AttributeSpan[]; canonical?: string;
}
const OPEN = /^([ \t]*):::([a-z][a-z0-9-]*)[ \t]*(\{.*\})?[ \t]*$/;
const CLOSE = /^([ \t]*):::[ \t]*$/;
export function readFence(text: string, from = 0, line = 1): FenceLine {
  const token: FenceLine = { text, from, to: from + text.length, line, indent: text.match(/^[ \t]*/)![0], kind: "text", name: "", attrsRaw: "", attributes: [] };
  if (CLOSE.test(text)) return { ...token, kind: "close" };
  const match = OPEN.exec(text);
  if (match) {
    token.kind = "open"; token.name = match[2]; token.attrsRaw = match[3] ?? "";
    if (!token.attrsRaw) return token;
    const base = text.indexOf("{") + 1;
    const inner = token.attrsRaw.slice(1, -1);
    const pairs = /([a-zA-Z][\w-]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
    let end = 0;
    for (const attr of inner.matchAll(pairs)) {
      const start = attr.index!;
      if (inner.slice(end, start).trim()) token.kind = "malformed";
      const nameFrom = from + base + start;
      const valueFrom = nameFrom + attr[0].indexOf('"') + 1;
      token.attributes.push({ name: attr[1], value: attr[2].replace(/\\(.)/g, "$1"), from: nameFrom, to: nameFrom + attr[0].length, nameFrom, nameTo: nameFrom + attr[1].length, valueFrom, valueTo: valueFrom + attr[2].length });
      end = start + attr[0].length;
    }
    if (inner.slice(end).trim()) token.kind = "malformed";
    if (token.kind === "open") return token;
  }
  if (/^[ \t]*:{2,}[ \t]*[a-zA-Z{]/.test(text)) {
    token.kind = "malformed";
    token.name = text.trim().match(/^:+\s*([\w-]+)/)?.[1]?.toLowerCase() ?? "";
    let attrs = text.slice(text.indexOf("{") < 0 ? text.length : text.indexOf("{"));
    attrs = attrs.replace(/([\w-]+)\s*=\s*'([^']*)'/g, '$1="$2"').replace(/([\w-]+)\s*=\s*([^"\s{}][^\s{}]*)/g, '$1="$2"');
    if (attrs) attrs = attrs.includes("}") ? attrs.slice(0, attrs.lastIndexOf("}") + 1) : `${attrs}}`;
    token.canonical = `${token.indent}:::${token.name}${attrs}`;
  }
  return token;
}
export function scanMmd(source: string): FenceLine[] {
  const tokens: FenceLine[] = [];
  let offset = 0;
  let code: { marker: string; length: number } | undefined;
  const lines = source.split(/\r?\n/);
  if (source.endsWith("\n")) lines.pop();
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const token = readFence(text, offset, i + 1);
    const fence = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(text);
    if (code) {
      token.kind = "text";
      if (fence && fence[1][0] === code.marker && fence[1].length >= code.length && !fence[2].trim()) code = undefined;
    } else if (fence && !(fence[1][0] === "`" && fence[2].includes("`"))) {
      code = { marker: fence[1][0], length: fence[1].length }; token.kind = "text";
    }
    tokens.push(token);
    offset += text.length + (source.slice(offset + text.length, offset + text.length + 2) === "\r\n" ? 2 : 1);
  }
  return tokens;
}
export function dedentBody(lines: string[], indent: string, verbatim = false): string[] {
  const stripped = lines.map(line => line.startsWith(indent) ? line.slice(indent.length) : line);
  const extra = !verbatim && stripped.some(line => line.trim()) && stripped.every(line => !line.trim() || /^( {2}|\t)/.test(line));
  return extra ? stripped.map(line => line.replace(/^( {2}|\t)/, "")) : stripped;
}
export function indentReplacement(raw: string, replacement: string): string {
  const indent = readFence(raw.split(/\r?\n/, 1)[0]).indent;
  return replacement.split(/\r?\n/).map(line => line ? indent + line : line).join(raw.includes("\r\n") ? "\r\n" : "\n");
}
