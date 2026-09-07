import type { DiagramData, DiagramNode } from "@/lib/diagrams/schema";

export const DIAGRAM_VIEWBOX = { width: 900, height: 560 } as const;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char] ?? char));
}

function shapeMarkup(node: DiagramNode): string {
  const { x, y, width: w, height: h } = node;
  if (node.shape === "diamond" || node.shape === "decision") return `<path d="M ${x + w / 2} ${y} L ${x + w} ${y + h / 2} L ${x + w / 2} ${y + h} L ${x} ${y + h / 2} Z"/>`;
  if (node.shape === "parallelogram") return `<path d="M ${x + 18} ${y} h ${w - 18} l -18 ${h} h -${w - 18} Z"/>`;
  if (node.shape === "document") return `<path d="M ${x} ${y} h ${w} v ${h - 12} q -${w / 4} 24 -${w / 2} 0 q -${w / 4} -24 -${w / 2} 0 Z"/>`;
  if (node.shape === "circle" || node.shape === "ellipse") return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  const radius = node.shape === "rounded-rectangle" || node.shape === "terminator" ? Math.min(18, h / 2) : node.shape === "cylinder" || node.shape === "database" ? 12 : 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/>`;
}

export function diagramToSvg(data: DiagramData): string {
  const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
  const edges = data.edges.map((edge) => {
    const source = nodesById.get(edge.source); const target = nodesById.get(edge.target);
    if (!source || !target) return "";
    const a = { x: source.x + source.width / 2, y: source.y + source.height / 2 }; const b = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#9b7653" stroke-width="2"${edge.style?.dashed ? ` stroke-dasharray="6 4"` : ""} marker-end="url(#arrow)"/>`;
  }).join("");
  const nodes = data.nodes.map((node) => `<g fill="${node.style?.fill ?? "#fffaf0"}" stroke="${node.style?.stroke ?? "#9b7653"}" stroke-width="${node.style?.strokeWidth ?? 2}">${shapeMarkup(node)}<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${node.style?.fontSize ?? 14}" fill="#352b22" stroke="none">${escapeXml(node.label ?? "")}</text></g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DIAGRAM_VIEWBOX.width} ${DIAGRAM_VIEWBOX.height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#9b7653"/></marker></defs>${edges}${nodes}</svg>`;
}
