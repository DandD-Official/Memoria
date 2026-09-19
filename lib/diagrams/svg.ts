import type { DiagramData, DiagramNode, DiagramEdge } from "@/lib/diagrams/schema";

export const DIAGRAM_VIEWBOX = { width: 900, height: 560 } as const;

export interface DiagramBounds { x: number; y: number; width: number; height: number }

/** Expands the drawing area around every node so moving an object beyond the
 * starter frame never clips it in the editor or in exports. */
export function getDiagramBounds(data: DiagramData, padding = 64): DiagramBounds {
  if (data.nodes.length === 0) return { x: 0, y: 0, width: DIAGRAM_VIEWBOX.width, height: DIAGRAM_VIEWBOX.height };
  const minX = Math.min(0, ...data.nodes.map((node) => node.x)) - padding;
  const minY = Math.min(0, ...data.nodes.map((node) => node.y)) - padding;
  const maxX = Math.max(DIAGRAM_VIEWBOX.width, ...data.nodes.map((node) => node.x + node.width)) + padding;
  const maxY = Math.max(DIAGRAM_VIEWBOX.height, ...data.nodes.map((node) => node.y + node.height)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[char] ?? char));
}

function shapeMarkup(node: DiagramNode): string {
  const { x, y, width: w, height: h } = node;
  if (node.shape === "diamond" || node.shape === "decision") return `<path d="M ${x + w / 2} ${y} L ${x + w} ${y + h / 2} L ${x + w / 2} ${y + h} L ${x} ${y + h / 2} Z"/>`;
  if (node.shape === "parallelogram") return `<path d="M ${x + 18} ${y} h ${w - 18} l -18 ${h} h -${w - 18} Z"/>`;
  if (node.shape === "document") return `<path d="M ${x} ${y} h ${w} v ${h - 12} q -${w / 4} 24 -${w / 2} 0 q -${w / 4} -24 -${w / 2} 0 Z"/>`;
  if (node.shape === "circle" || node.shape === "ellipse") return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (node.shape === "cylinder" || node.shape === "database") return `<path d="M ${x} ${y + 12} a ${w / 2} 12 0 0 1 ${w} 0 v ${h - 24} a ${w / 2} 12 0 0 1 -${w} 0 Z M ${x} ${y + 12} a ${w / 2} 12 0 0 0 ${w} 0"/>`;
  const radius = node.shape === "rounded-rectangle" || node.shape === "terminator" ? Math.min(18, h / 2) : node.shape === "cylinder" || node.shape === "database" ? 12 : 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/>`;
}


/** Orthogonal connectors meet the shape boundary instead of crossing its label. */
export function edgeGeometry(source: DiagramNode, target: DiagramNode) {
  const a = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const b = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const horizontal = Math.abs(b.x - a.x) / Math.max(source.width, target.width) >= Math.abs(b.y - a.y) / Math.max(source.height, target.height);
  if (horizontal) {
    const sign = b.x >= a.x ? 1 : -1;
    a.x += sign * source.width / 2; b.x -= sign * target.width / 2;
    const x = (a.x + b.x) / 2;
    return { path: `M ${a.x} ${a.y} H ${x} V ${b.y} H ${b.x}`, x, y: (a.y + b.y) / 2 };
  }
  const sign = b.y >= a.y ? 1 : -1;
  a.y += sign * source.height / 2; b.y -= sign * target.height / 2;
  const y = (a.y + b.y) / 2;
  return { path: `M ${a.x} ${a.y} V ${y} H ${b.x} V ${b.y}`, x: (a.x + b.x) / 2, y };
}

export function diagramEdgeMarkup(edge: DiagramEdge, data: DiagramData, marker = "arrow"): string {
  const source = data.nodes.find(node => node.id === edge.source), target = data.nodes.find(node => node.id === edge.target);
  if (!source || !target) return "";
  const line = edgeGeometry(source, target);
  return `<path d="${line.path}" fill="none" stroke="#607652" stroke-width="${edge.style?.strokeWidth ?? 2}"${edge.style?.dashed ? ' stroke-dasharray="6 4"' : ''}${edge.directional ? ` marker-end="url(#${marker})"` : ''}/>${edge.label ? `<text x="${line.x}" y="${line.y - 9}" text-anchor="middle" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#22312b" stroke="#f7f7ef" stroke-width="5" paint-order="stroke">${escapeXml(edge.label)}</text>` : ''}`;
}

export function diagramNodeMarkup(node: DiagramNode): string {
  const fontSize = node.style?.fontSize ?? 16;
  const limit = Math.max(4, Math.floor((node.width - 24) / (fontSize * .56)));
  const lines: string[] = [];
  for (const paragraph of (node.label ?? "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && line.length + word.length + 1 > limit) { lines.push(line); line = ""; }
      line += (line ? " " : "") + word;
    }
    lines.push(line);
  }
  const align = node.style?.textAlign ?? "center";
  const x = align === "left" ? node.x + 12 : align === "right" ? node.x + node.width - 12 : node.x + node.width / 2;
  const y = node.y + node.height / 2 - (lines.length - 1) * fontSize * .65;
  return `<g fill="${node.style?.fill ?? "#f7f7ef"}" stroke="${node.style?.stroke ?? "#2b4837"}" stroke-width="${node.style?.strokeWidth ?? 2}"${node.style?.dashed ? ' stroke-dasharray="6 4"' : ''}>${shapeMarkup(node)}<text text-anchor="${align === "left" ? "start" : align === "right" ? "end" : "middle"}" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" fill="${node.style?.textColor ?? "#22312b"}" stroke="none">${lines.map((line, i) => `<tspan x="${x}" y="${y + i * fontSize * 1.3}">${escapeXml(line)}</tspan>`).join("")}</text></g>`;
}

export const diagramArrow = (id = "arrow") => `<marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#607652"/></marker>`;

export function diagramToSvg(data: DiagramData): string {
  const bounds = getDiagramBounds(data);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"><defs>${diagramArrow()}</defs>${data.edges.map(edge => diagramEdgeMarkup(edge, data)).join("")}${data.nodes.map(diagramNodeMarkup).join("")}</svg>`;
}
