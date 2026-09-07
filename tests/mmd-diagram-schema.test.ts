import { describe, expect, it } from "vitest";
import { diagramDataSchema, emptyDiagramData, validateDiagramData, DIAGRAM_SCHEMA_VERSION } from "@/lib/diagrams/schema";

const validNode = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  id,
  shape: "rectangle",
  x: 0,
  y: 0,
  width: 120,
  height: 60,
  label: "Node",
  ...overrides,
});

describe("diagramDataSchema — valid diagrams", () => {
  it("accepts an empty diagram", () => {
    const result = diagramDataSchema.safeParse(emptyDiagramData());
    expect(result.success).toBe(true);
  });

  it("accepts nodes and edges that reference real node ids", () => {
    const diagram = {
      version: 1,
      type: "memoria-diagram",
      nodes: [validNode("a"), validNode("b", { shape: "diamond" })],
      edges: [{ id: "e1", source: "a", target: "b", directional: true }],
    };
    const result = diagramDataSchema.safeParse(diagram);
    expect(result.success).toBe(true);
  });

  it("accepts every documented shape type", () => {
    const shapes = [
      "rectangle",
      "rounded-rectangle",
      "circle",
      "ellipse",
      "diamond",
      "parallelogram",
      "cylinder",
      "document",
      "decision",
      "terminator",
      "database",
      "process",
    ];
    for (const shape of shapes) {
      const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a", { shape })], edges: [] };
      const result = diagramDataSchema.safeParse(diagram);
      expect(result.success, `shape "${shape}" should be valid`).toBe(true);
    }
  });

  it("accepts node/edge styling within documented bounds", () => {
    const diagram = {
      version: 1,
      type: "memoria-diagram",
      nodes: [
        validNode("a", {
          style: { fill: "#FF0000", stroke: "#000", strokeWidth: 2, dashed: true, fontSize: 14, textAlign: "center" },
        }),
      ],
      edges: [],
    };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(true);
  });
});

describe("diagramDataSchema — invalid nodes", () => {
  it("rejects a node with an unrecognized shape", () => {
    const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a", { shape: "hexagon" })], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects a node with non-finite coordinates", () => {
    const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a", { x: Infinity })], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects a node with zero or negative dimensions", () => {
    const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a", { width: 0 })], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects duplicate node ids", () => {
    const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a"), validNode("a")], edges: [] };
    const result = diagramDataSchema.safeParse(diagram);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/Duplicate node id/);
  });

  it("rejects a node style with an invalid hex color", () => {
    const diagram = { version: 1, type: "memoria-diagram", nodes: [validNode("a", { style: { fill: "red" } })], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });
});

describe("diagramDataSchema — invalid edges", () => {
  it("rejects an edge referencing a missing source node", () => {
    const diagram = {
      version: 1,
      type: "memoria-diagram",
      nodes: [validNode("a")],
      edges: [{ id: "e1", source: "ghost", target: "a", directional: false }],
    };
    const result = diagramDataSchema.safeParse(diagram);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/missing source node/);
  });

  it("rejects an edge referencing a missing target node", () => {
    const diagram = {
      version: 1,
      type: "memoria-diagram",
      nodes: [validNode("a")],
      edges: [{ id: "e1", source: "a", target: "ghost", directional: false }],
    };
    const result = diagramDataSchema.safeParse(diagram);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/missing target node/);
  });

  it("rejects an edge missing the required 'directional' flag", () => {
    const diagram = {
      version: 1,
      type: "memoria-diagram",
      nodes: [validNode("a"), validNode("b")],
      edges: [{ id: "e1", source: "a", target: "b" }],
    };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });
});

describe("diagramDataSchema — invalid properties / structure", () => {
  it("rejects a missing 'type' discriminator", () => {
    const diagram = { version: 1, nodes: [], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects a wrong 'type' value", () => {
    const diagram = { version: 1, type: "not-a-diagram", nodes: [], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects completely malformed input without throwing", () => {
    expect(() => diagramDataSchema.safeParse(null)).not.toThrow();
    expect(() => diagramDataSchema.safeParse("not an object")).not.toThrow();
    expect(() => diagramDataSchema.safeParse(42)).not.toThrow();
    expect(diagramDataSchema.safeParse(null).success).toBe(false);
  });
});

describe("diagramDataSchema — version validation", () => {
  it("rejects a version other than the current DIAGRAM_SCHEMA_VERSION", () => {
    const diagram = { version: 2, type: "memoria-diagram", nodes: [], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("rejects a missing version field", () => {
    const diagram = { type: "memoria-diagram", nodes: [], edges: [] };
    expect(diagramDataSchema.safeParse(diagram).success).toBe(false);
  });

  it("DIAGRAM_SCHEMA_VERSION matches what emptyDiagramData() produces", () => {
    expect(emptyDiagramData().version).toBe(DIAGRAM_SCHEMA_VERSION);
  });
});

describe("validateDiagramData", () => {
  it("returns a typed success result for valid input", () => {
    const result = validateDiagramData(emptyDiagramData());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nodes).toEqual([]);
  });

  it("returns a human-readable error message for invalid input", () => {
    const result = validateDiagramData({ version: 1, type: "wrong", nodes: [], edges: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(typeof result.error).toBe("string");
  });
});
