import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isBlockNode } from "@/lib/mmd/ast";
import { collectMmdErrors, parseMmd } from "@/lib/mmd/parser";
import { sanitizeSvgMarkup } from "@/lib/svg/sanitize";

const fixture = readFileSync("tests/fixtures/mmd-export-fidelity.mmd", "utf8");

function blockNames(source: string): string[] {
  const names: string[] = [];
  const walk = (nodes: ReturnType<typeof parseMmd>["children"]) => {
    for (const node of nodes) {
      if (!isBlockNode(node)) continue;
      names.push(node.block);
      walk(node.children);
    }
  };
  walk(parseMmd(source).children);
  return names;
}

describe("MMD export fidelity fixture", () => {
  it("covers every supported visual block without parser errors", () => {
    const document = parseMmd(fixture);
    expect(collectMmdErrors(document)).toEqual([]);
    expect(new Set(blockNames(fixture))).toEqual(new Set([
      "note", "tip", "warning", "danger", "info", "success",
      "definition", "key-concept", "example", "important", "summary", "math",
      "code",
      "section", "card", "columns", "column", "details", "image", "gallery",
      "diagram", "image-request", "svg",
    ]));
  });

  it("contains real local image and SVG sources", () => {
    expect(fixture).toContain('src="/export-fixture.svg"');
    expect(sanitizeSvgMarkup('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff" /></svg>')).toContain("<rect");
  });
});
