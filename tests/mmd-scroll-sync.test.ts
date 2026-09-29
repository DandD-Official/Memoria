import { describe, expect, it } from "vitest";
import { parseMmd } from "@/lib/mmd/parser";
import { mapScrollOffset, normalizeScrollAnchors } from "@/lib/mmd/scroll-sync";
import { rehypeSourceLines } from "@/lib/mmd/source-map";

describe("source-aware split scrolling", () => {
  it("tracks repeated text and dedented nested bodies at their original lines", () => {
    const source = "Same\n\n:::note\n  Same\n\n  ## Inner\n:::\n\nSame";
    const doc = parseMmd(source, { sourcePositions: true });
    expect(doc.children.map(node => node.position?.openLine)).toEqual([1, 3, 8]);
    const block = doc.children[1];
    expect(block.type).toBe("block");
    if (block.type === "block") {
      expect(block.children[0].position).toMatchObject({ openLine: 4, closeLine: 6 });
      expect(block.children[0]).toMatchObject({ content: "Same\n\n## Inner" });
    }
    expect(parseMmd("plain").children[0]).toEqual({ type: "markdown", content: "plain" });
  });

  it("maps by content landmarks instead of equal percentages, in either direction", () => {
    const anchors = normalizeScrollAnchors([{ source: 100, preview: 400 }, { source: 300, preview: 500 }], 1000, 800);
    expect(mapScrollOffset(anchors, 200, "source")).toBe(450);
    expect(mapScrollOffset(anchors, 450, "preview")).toBe(200);
    expect(mapScrollOffset(anchors, 1000, "source")).toBe(800);
    expect(mapScrollOffset(anchors, -50, "source")).toBe(0);
  });

  it("keeps scrolling monotonic with duplicate parents, columns and hidden content", () => {
    const points = normalizeScrollAnchors([{ source: 100, preview: 100 }, { source: 100, preview: 100 }, { source: 200, preview: 50 }, { source: 300, preview: 300 }], 500, 500);
    expect(points).toEqual([{ source: 0, preview: 0 }, { source: 100, preview: 100 }, { source: 300, preview: 300 }, { source: 500, preview: 500 }]);
    expect(mapScrollOffset(normalizeScrollAnchors([], 0, 0), 0, "source")).toBe(0);
  });

  it("offsets Markdown positions without modifying text or unrelated elements", () => {
    const heading = { type: "element", tagName: "h2", position: { start: { line: 3 }, end: { line: 3 } }, properties: { id: "topic" } };
    rehypeSourceLines({ startLine: 12 })({ type: "root", children: [heading] });
    expect(heading.properties).toEqual({ id: "topic", "data-source-line": 14, "data-source-end": 14 });
  });
});
