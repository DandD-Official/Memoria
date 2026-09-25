import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";

/** Structural checks; visual/factual accuracy still needs human review. */
export function svgQualityIssues(source: string): string[] {
  const safe = sanitizeSvgMarkup(source);
  if (!safe) return ["SVG is malformed or contains unsupported markup."];
  const issues: string[] = [];
  const root = safe.match(/^<svg\b[^>]*>/)?.[0] || "";
  const viewBox = root.match(/\bviewBox="([^"]*)"/)?.[1].trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) issues.push("SVG needs a finite viewBox with positive width and height.");
  if (!/<(?:path|rect|circle|ellipse|line|polyline|polygon|text|use)\b/.test(safe)) issues.push("SVG contains no visible drawing elements.");
  const ids = [...safe.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) issues.push("SVG has duplicate IDs; use a unique prefix per visual.");
  const references = [...safe.matchAll(/(?:url\(#|href="#)([\w:.-]+)/g)].map(match => match[1]);
  if (references.some(id => !ids.includes(id))) issues.push("SVG has a missing marker, gradient, or referenced shape.");
  return issues;
}
