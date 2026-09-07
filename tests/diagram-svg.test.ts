import { describe, expect, it } from "vitest";
import { diagramToSvg } from "@/lib/diagrams/svg";

describe("diagram SVG previews", () => {
  it("renders supported shapes and escapes labels", () => {
    const shapes = ["rectangle", "rounded-rectangle", "circle", "ellipse", "diamond", "parallelogram", "cylinder", "document", "decision", "terminator", "database", "process"] as const;
    const svg = diagramToSvg({ version: 1, type: "memoria-diagram", nodes: shapes.map((shape, index) => ({ id: shape, shape, x: index * 10, y: 0, width: 100, height: 60, label: `<${shape}>`, style: undefined })), edges: [{ id: "e", source: shapes[0], target: shapes[1], directional: true, style: { dashed: true } }] });
    expect(svg).toContain("&lt;rectangle&gt;");
    expect(svg).toContain("stroke-dasharray=\"6 4\"");
    expect(svg.match(/<g /g)?.length).toBe(shapes.length);
    expect(svg).toContain("<ellipse");
    expect(svg).toContain("<path d=\"M");
  });

  it("omits edges whose endpoints no longer exist", () => {
    const svg = diagramToSvg({ version: 1, type: "memoria-diagram", nodes: [], edges: [{ id: "e", source: "missing", target: "also-missing", directional: true }] });
    expect(svg).not.toContain("<line");
  });
});
