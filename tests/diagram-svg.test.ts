import { describe, expect, it } from "vitest";
import { diagramToSvg, getDiagramBounds } from "@/lib/diagrams/svg";

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

  it("expands the viewbox around nodes moved beyond the starter frame", () => {
    const data = { version: 1 as const, type: "memoria-diagram" as const, nodes: [{ id: "far", shape: "rectangle" as const, x: 1200, y: 900, width: 180, height: 80, label: "Far away", style: undefined }], edges: [] };
    const bounds = getDiagramBounds(data);
    expect(bounds.width).toBeGreaterThan(900);
    expect(bounds.height).toBeGreaterThan(560);
    expect(diagramToSvg(data)).toContain(`viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"`);
  });
});
