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

export const diagramDataSchema = z
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

export type DiagramData = z.infer<typeof diagramDataSchema>;
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
  const result = diagramDataSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues[0]?.message ?? "Invalid diagram data." };
}
