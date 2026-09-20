export const SHAPES = [
  "rectangle", "rounded-rectangle", "square", "circle", "ellipse", "triangle", "right-triangle", "diamond", "pentagon", "hexagon", "octagon", "star", "parallelogram", "trapezoid", "cross", "cloud", "callout", "cylinder", "cube", "note", "brace", "bracket", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-double", "chevron",
  "process", "decision", "terminator", "data", "predefined-process", "manual-input", "preparation", "delay", "display", "database", "stored-data", "document", "multi-document", "connector", "off-page", "merge", "extract", "summing-junction", "or",
  "actor", "use-case", "system-boundary", "class", "interface", "package", "component", "lifeline", "activation", "initial-state", "final-state", "fork", "swimlane", "pool", "frame",
  "entity", "weak-entity", "attribute", "key-attribute", "relationship", "sticky", "text", "label", "banner", "divider", "line", "icon", "image",
] as const;
export type ShapeId = typeof SHAPES[number];
export const SHAPE_REGISTRY = Object.fromEntries(SHAPES.map((id, i) => [id, {
  id, label: id.replaceAll("-", " "), category: i < 28 ? "Basic" : i < 48 ? "Flowchart" : i < 62 ? "UML & containers" : i < 67 ? "ER" : "Notes & media",
  container: ["system-boundary", "package", "swimlane", "pool", "frame"].includes(id),
}])) as Record<ShapeId, { id: ShapeId; label: string; category: string; container: boolean }>;
