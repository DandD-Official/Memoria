import { stripCodeFences } from "@/lib/validation/reviewer";
import { analyzeMmd } from "@/lib/mmd/diagnostics";
import { svgQualityIssues } from "@/lib/svg/quality";

export function generatedVisualIssues(text: string): string[] {
  const content = stripCodeFences(text);
  if (!/:::svg\b|<svg\b/i.test(content)) return [];
  const issues = analyzeMmd(content)
    .filter(item => item.severity === "error" || item.code === "svg-unsafe")
    .map(item => `Line ${item.line}: ${item.message}`);
  const blocks = [...content.matchAll(/^\s*:::svg(?:\{[^\n]*\})?\s*\n([\s\S]*?)^\s*:::\s*$/gm)];
  for (const [index, block] of blocks.entries()) {
    issues.push(...svgQualityIssues(block[1]).map(issue => `Visual ${index + 1}: ${issue}`));
  }
  const outside = content.replace(/^\s*:::svg(?:\{[^\n]*\})?\s*\n[\s\S]*?^\s*:::\s*$/gm, "");
  if (/<svg\b/i.test(outside)) issues.push("Place each complete SVG inside a supported :::svg block.");
  return [...new Set(issues)].slice(0, 12);
}
