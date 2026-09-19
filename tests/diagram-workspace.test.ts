import { describe, expect, it } from "vitest";
import { addConnectedNode, arrangeDiagram, attachNearby, diagramTemplate } from "@/lib/diagrams/workspace";
import { diagramDataSchema, emptyDiagramData } from "@/lib/diagrams/schema";
import { diagramToSvg, edgeGeometry } from "@/lib/diagrams/svg";

describe("diagram workspace", () => {
  it("creates a connected branch without selecting endpoints", () => {
    const root = addConnectedNode(emptyDiagramData(), "rectangle");
    const branch = addConnectedNode(root.data, "diamond", root.node.id, "down");
    expect(branch.data.edges).toMatchObject([{ source: root.node.id, target: branch.node.id, directional: true }]);
    expect(branch.node.y).toBeGreaterThan(root.node.y + root.node.height);
    expect(diagramDataSchema.safeParse(branch.data).success).toBe(true);
  });
  it("snaps nearby nodes, avoids duplicate edges, and ignores distant nodes", () => {
    const root = addConnectedNode(emptyDiagramData(), "rectangle");
    const next = addConnectedNode(root.data, "rectangle");
    next.node.x = root.node.x + root.node.width + 88; next.node.y = root.node.y + 6;
    const attached = attachNearby(next.data, next.node.id);
    expect(attached.edges).toHaveLength(1);
    expect(attached.nodes[1].x).toBe(root.node.x + root.node.width + 80);
    expect(attachNearby(attached, next.node.id).edges).toHaveLength(1);
    const distant = { ...next.data, nodes: [root.node, { ...next.node, x: 9000 }] };
    expect(attachNearby(distant, next.node.id)).toBe(distant);
  });
  it("arranges cycles and disconnected nodes without dropping content", () => {
    const template = diagramTemplate("mindmap");
    template.edges.push({ id: "cycle", source: template.nodes[1].id, target: template.nodes[0].id, directional: false });
    const withExtra = addConnectedNode(template, "document").data;
    const arranged = arrangeDiagram(withExtra, "down");
    expect(arranged.nodes.map(node => node.label)).toEqual(withExtra.nodes.map(node => node.label));
    expect(arranged.edges).toEqual(withExtra.edges);
    expect(new Set(arranged.nodes.map(node => `${node.x},${node.y}`)).size).toBe(arranged.nodes.length);
  });
  it("exports boundary connections, labels, and style without a forced arrow", () => {
    const data = diagramTemplate("flow"); const edge = data.edges[0]; edge.directional = false; edge.label = 'A < B';
    const [source, target] = data.nodes;
    expect(edgeGeometry(source, target).path).toContain(`M ${source.x + source.width} ${source.y + source.height / 2}`);
    source.style = { fill: "#123456", textColor: "#ffffff", dashed: true, textAlign: "left" };
    const svg = diagramToSvg({ ...data, edges: [edge] });
    expect(svg).toContain("A &lt; B"); expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('text-anchor="start"'); expect(svg).not.toContain('marker-end=');
  });
});
