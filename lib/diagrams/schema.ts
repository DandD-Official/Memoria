import { SHAPES } from "@/lib/diagrams/shapes";
import { ICONS } from "@/lib/diagrams/icons";
import { z } from "zod";

/**
 * The versioned diagram data schema — see .context/diagram-system.md.
 * `Diagram.data` (Prisma, prisma/schema.prisma) stores exactly this
 * shape as JSON. This file is the single source of truth for it; the
 * eventual canvas editor (Milestone 3's remaining, larger piece — not
 * built yet, see .context/milestones.md) should read/write through this
 * schema rather than trusting whatever a UI library's internal state
 * shape happens to be, so the persisted format stays independent of
 * whichever library ends up wrapped (@xyflow/react is recommended, not
 * yet installed).
 */

export const DIAGRAM_SCHEMA_VERSION = 1 as const;

export const SHAPE_TYPES = [
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
] as const;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{3,8}$/, "must be a hex color like #RRGGBB")
  .optional();

const nodeStyleSchema = z
  .object({
    fill: hexColor,
    stroke: hexColor,
    textColor: hexColor,
    strokeWidth: z.number().min(0).max(20).optional(),
    dashed: z.boolean().optional(),
    fontSize: z.number().min(8).max(72).optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
  })
  .optional();

const edgeStyleSchema = z
  .object({
    strokeWidth: z.number().min(0).max(20).optional(),
    dashed: z.boolean().optional(),
  })
  .optional();

export const diagramNodeSchema = z.object({
  id: z.string().min(1).max(100),
  shape: z.enum(SHAPE_TYPES),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive().max(10000),
  height: z.number().positive().max(10000),
  label: z.string().max(500).optional(),
  style: nodeStyleSchema,
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  label: z.string().max(200).optional(),
  directional: z.boolean(),
  style: edgeStyleSchema,
});

export const diagramDataV1Schema = z
  .object({
    version: z.literal(DIAGRAM_SCHEMA_VERSION),
    type: z.literal("memoria-diagram"),
    nodes: z.array(diagramNodeSchema).max(500),
    edges: z.array(diagramEdgeSchema).max(1000),
  })
  .superRefine((diagram, ctx) => {
    const nodeIds = new Set(diagram.nodes.map((n) => n.id));
    // Two nodes sharing an id would make the diagram ambiguous to render
    // and to edit (which one does a click select?) — reject at the
    // schema level rather than letting the editor or renderer guess.
    if (nodeIds.size !== diagram.nodes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate node id in nodes[]." });
    }
    for (const edge of diagram.edges) {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Edge "${edge.id}" references missing source node "${edge.source}".` });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Edge "${edge.id}" references missing target node "${edge.target}".` });
      }
    }
  });

export type DiagramData = z.infer<typeof diagramDataV1Schema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;

/** An empty, valid starting point for a brand-new diagram — what the
 * (not-yet-built) canvas editor should initialize with. */
export function emptyDiagramData(): DiagramData {
  return { version: DIAGRAM_SCHEMA_VERSION, type: "memoria-diagram", nodes: [], edges: [] };
}

/** Safe parse wrapper returning a plain result shape, matching the
 * pattern already used by lib/validation/*.ts elsewhere in this codebase
 * (safeParse + .issues[0]?.message for the first human-readable error). */
export function validateDiagramData(input: unknown): { success: true; data: DiagramData } | { success: false; error: string } {
  const result = diagramDataV1Schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues[0]?.message ?? "Invalid diagram data." };
}

export const CURRENT_DIAGRAM_VERSION = 2 as const;
const color = z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);
const identifier = z.string().min(1).max(100).regex(/^[\w-]+$/);
const text = (max: number) => z.string().max(max).refine(value => !/<\/?(?:script|iframe|object|foreignObject)\b/i.test(value), "Executable markup is not allowed");
export const pointSchema = z.object({ x: coordinate, y: coordinate }).strict();
export const endpointSchema = z.union([z.object({ nodeId: identifier, portId: z.enum(["top", "right", "bottom", "left", "center"]).optional() }).strict(), pointSchema]);
export const MARKERS = ["none", "arrow", "open-arrow", "block", "triangle", "diamond", "diamond-filled", "circle", "cross", "one", "many", "zero-one", "zero-many"] as const;
export const diagramNodeV2Schema = z.object({
  id: identifier, shape: z.enum(SHAPES), x: coordinate, y: coordinate,
  width: z.number().finite().positive().max(10000), height: z.number().finite().positive().max(10000),
  kind: z.enum(["shape", "text", "image", "icon", "container", "note"]).default("shape"),
  label: text(4000).optional(), rotation: z.number().finite().min(-360).max(360).default(0), locked: z.boolean().default(false),
  parentId: identifier.optional(), z: z.number().int().min(-100000).max(100000).default(0),
  iconId: z.string().refine(id => Object.hasOwn(ICONS, id), "Unknown icon").optional(), imageRef: z.string().regex(/^media:\/\/[\w-]{1,100}$/).optional(),
  compartments: z.array(text(1000)).max(3).optional(),
  legacy: z.boolean().optional(),
  style: z.object({
    fill: color.optional(), stroke: color.optional(), textColor: color.optional(), strokeWidth: z.number().finite().min(0).max(20).optional(),
    dashed: z.boolean().optional(), dash: z.enum(["solid", "dashed", "dotted"]).optional(),
    fontSize: z.number().finite().min(8).max(72).optional(), textAlign: z.enum(["left", "center", "right"]).optional(),
    opacity: z.number().finite().min(0).max(1).optional(), radius: z.number().finite().min(0).max(100).optional(),
    gradient: color.optional(), shadow: z.boolean().optional(), fontFamily: z.enum(["sans", "serif", "mono", "handwriting"]).optional(),
    bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), strike: z.boolean().optional(),
    verticalAlign: z.enum(["top", "middle", "bottom"]).optional(), lineHeight: z.number().finite().min(1).max(3).optional(),
    padding: z.number().finite().min(0).max(100).optional(), highlight: color.optional(),
  }).strict().optional(),
}).strict();
export const diagramEdgeV2Schema = z.object({
  id: identifier, source: endpointSchema, target: endpointSchema, label: text(500).optional(),
  routing: z.enum(["straight", "orthogonal", "curved"]).default("orthogonal"), waypoints: z.array(pointSchema).max(100).default([]),
  sourceMarker: z.enum(MARKERS).default("none"), targetMarker: z.enum(MARKERS).default("arrow"),
  color: color.default("#607652"), width: z.number().finite().min(.5).max(20).default(2), dash: z.enum(["solid", "dashed", "dotted"]).default("solid"),
  labelPosition: z.number().finite().min(0).max(1).default(.5), labelStyle: z.object({ fontSize: z.number().min(8).max(72).optional(), color: color.optional(), bold: z.boolean().optional(), italic: z.boolean().optional() }).strict().optional(),
  legacy: z.boolean().optional(),
}).strict();
export const diagramDataV2Schema = z.object({
  version: z.literal(2), type: z.literal("memoria-diagram"), paper: color,
  nodes: z.array(diagramNodeV2Schema).max(1000), edges: z.array(diagramEdgeV2Schema).max(2000),
}).strict().superRefine((data, ctx) => {
  const nodes = new Map(data.nodes.map(node => [node.id, node]));
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (nodes.size !== data.nodes.length) fail("Duplicate node id in nodes[].");
  if (new Set(data.edges.map(edge => edge.id)).size !== data.edges.length) fail("Duplicate edge id.");
  for (const edge of data.edges) for (const end of [edge.source, edge.target]) if ("nodeId" in end && !nodes.has(end.nodeId)) fail("Connection references a missing node.");
  for (const node of data.nodes) {
    const visited = new Set([node.id]); let parent = node.parentId;
    while (parent) {
      if (visited.has(parent)) { fail("Container cycle."); break; }
      visited.add(parent); const item = nodes.get(parent);
      if (!item || item.kind !== "container") { fail("Missing parent container."); break; }
      parent = item.parentId;
    }
    if (node.kind === "image" && !node.imageRef) fail("Image requires an owned media reference.");
    if (node.kind === "icon" && !node.iconId) fail("Icon requires a registered icon.");
  }
});
export const diagramDataSchema = z.union([diagramDataV1Schema, diagramDataV2Schema]);
export type DiagramDataV2 = z.infer<typeof diagramDataV2Schema>;
export type NodeV2 = z.infer<typeof diagramNodeV2Schema>;
export type EdgeV2 = z.infer<typeof diagramEdgeV2Schema>;
export type Endpoint = z.infer<typeof endpointSchema>;
export type Point = z.infer<typeof pointSchema>;
export type PersistedDiagramData = DiagramData | DiagramDataV2;
export function upgradeDiagram(data: PersistedDiagramData): DiagramDataV2 {
  if (data.version === 2) return data;
  return { version: 2, type: "memoria-diagram", paper: "#f7f7ef",
    nodes: data.nodes.map((node, z) => ({ ...node, kind: "shape", rotation: 0, locked: false, z, legacy: true })),
    edges: data.edges.map(edge => ({ id: edge.id, source: { nodeId: edge.source }, target: { nodeId: edge.target }, label: edge.label, routing: "orthogonal", waypoints: [], sourceMarker: "none", targetMarker: edge.directional ? "arrow" : "none", color: "#607652", width: edge.style?.strokeWidth ?? 2, dash: edge.style?.dashed ? "dashed" : "solid", labelPosition: .5, legacy: true })),
  };
}
export const emptyDiagramV2 = (): DiagramDataV2 => ({ version: 2, type: "memoria-diagram", paper: "#f7f7ef", nodes: [], edges: [] });
