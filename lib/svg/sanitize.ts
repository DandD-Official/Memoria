/**
 * Sanitizes the deliberately-allowed inline SVG payload used by the MMD
 * `:::svg` block. Raw HTML is still not enabled anywhere else in MMD.
 *
 * This is intentionally a small allowlist rather than a "remove a few bad
 * strings" filter. SVG is XML-shaped markup, so every element and attribute
 * that reaches dangerouslySetInnerHTML is validated and the markup is
 * reconstructed from the validated pieces.
 */

export const MAX_INLINE_SVG_CHARS = 500_000;

const ALLOWED_ELEMENTS = new Set([
  "svg", "g", "defs", "marker", "path", "rect", "circle", "ellipse", "line",
  "polyline", "polygon", "text", "tspan", "title", "desc", "linearGradient",
  "radialGradient", "stop", "clipPath", "mask", "pattern", "symbol", "use",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "xmlns", "viewBox", "width", "height", "role", "id", "class",
  "aria-label", "aria-labelledby", "fill", "fill-opacity", "fill-rule",
  "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "opacity",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d",
  "points", "transform", "text-anchor", "dominant-baseline", "alignment-baseline",
  "baseline-shift", "font-family", "font-size", "font-weight", "font-style",
  "letter-spacing", "preserveAspectRatio", "markerWidth", "markerHeight",
  "refX", "refY", "orient", "marker-start", "marker-mid", "marker-end",
  "gradientUnits", "gradientTransform", "offset", "stop-color", "stop-opacity",
  "clipPathUnits", "clip-path", "mask", "maskUnits", "maskContentUnits",
  "patternUnits", "patternContentUnits", "patternTransform", "href",
]);

const CONTAINER_ELEMENTS = new Set([
  "svg", "g", "defs", "marker", "text", "tspan", "linearGradient", "radialGradient",
  "clipPath", "mask", "pattern", "symbol", "title", "desc", "use",
]);

const XML_DECLARATION_RE = /^\s*<\?xml\b[^>]*\?>\s*/i;
const TAG_RE = /<!--[\s\S]*?-->|<\/?[A-Za-z][A-Za-z0-9:.-]*[^>]*>/g;
const ATTRIBUTE_RE = /([A-Za-z_:][A-Za-z0-9:._-]*)(?:\s*=\s*("(?:[^"\\]|\\.)*"))?/y;

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function safeAttributeValue(name: string, value: string): boolean {
  if (/[<>]/.test(value) || /(?:javascript|vbscript|data):/i.test(value)) return false;
  if (name === "xmlns" && value !== "http://www.w3.org/2000/svg") return false;
  if (/url\s*\(/i.test(value) && !/^\s*url\(\s*#[A-Za-z_][A-Za-z0-9:._-]*\s*\)\s*$/i.test(value)) return false;
  if ((name === "href" || name === "xlink:href") && !/^#[A-Za-z_][A-Za-z0-9:._-]*$/.test(value)) return false;
  return true;
}

function parseAttributes(source: string): { attrs: string[]; selfClosing: boolean } | null {
  let input = source.trim();
  const selfClosing = /\/\s*$/.test(input);
  if (selfClosing) input = input.replace(/\/\s*$/, "").trim();

  const attrs: string[] = [];
  let position = 0;
  while (position < input.length) {
    while (/\s/.test(input[position] ?? "")) position += 1;
    if (position >= input.length) break;

    ATTRIBUTE_RE.lastIndex = position;
    const match = ATTRIBUTE_RE.exec(input);
    if (!match || match.index !== position) return null;
    const name = match[1];
    const quotedValue = match[2];
    if (!ALLOWED_ATTRIBUTES.has(name) || !quotedValue) return null;
    const value = quotedValue.slice(1, -1).replace(/\\(.)/g, "$1");
    if (!safeAttributeValue(name, value)) return null;
    attrs.push(`${name}="${escapeAttribute(value)}"`);
    position = ATTRIBUTE_RE.lastIndex;
  }
  return { attrs, selfClosing };
}

/** Returns safe reconstructed SVG markup, or null when the source is not a
 * self-contained SVG that this renderer is willing to put in the DOM. */
export function sanitizeSvgMarkup(source: string): string | null {
  if (!source || source.length > MAX_INLINE_SVG_CHARS) return null;
  const input = source.trim().replace(XML_DECLARATION_RE, "");
  if (!input || /<!DOCTYPE|<!\[CDATA\[|<\?(?!xml\b)/i.test(input)) return null;

  const output: string[] = [];
  const stack: string[] = [];
  let cursor = 0;
  let rootSeen = false;

  for (const match of input.matchAll(TAG_RE)) {
    const index = match.index ?? 0;
    const text = input.slice(cursor, index);
    if (text.includes("<") || text.includes(">")) return null;
    output.push(text);

    const token = match[0];
    if (token.startsWith("<!--")) {
      cursor = index + token.length;
      continue;
    }

    const closing = /^<\/([A-Za-z][A-Za-z0-9:.-]*)\s*>$/.exec(token);
    if (closing) {
      const name = closing[1];
      if (!stack.length || stack[stack.length - 1] !== name) return null;
      stack.pop();
      output.push(`</${name}>`);
      cursor = index + token.length;
      continue;
    }

    const opening = /^<([A-Za-z][A-Za-z0-9:.-]*)([\s\S]*)>$/.exec(token);
    if (!opening) return null;
    const name = opening[1];
    if (!ALLOWED_ELEMENTS.has(name) || (!rootSeen && name !== "svg") || (rootSeen && !stack.length)) return null;
    const parsed = parseAttributes(opening[2]);
    if (!parsed) return null;
    if (name === "svg" && !parsed.attrs.some((attr) => attr.startsWith("xmlns="))) {
      parsed.attrs.unshift('xmlns="http://www.w3.org/2000/svg"');
    }
    output.push(`<${name}${parsed.attrs.length ? ` ${parsed.attrs.join(" ")}` : ""}${parsed.selfClosing ? " />" : ">"}`);
    rootSeen = true;
    if (!parsed.selfClosing) {
      if (!CONTAINER_ELEMENTS.has(name)) return null;
      stack.push(name);
    }
    cursor = index + token.length;
  }

  const trailing = input.slice(cursor);
  if (trailing.includes("<") || trailing.includes(">") || stack.length !== 0 || !rootSeen) return null;
  output.push(trailing);
  return output.join("").trim();
}
