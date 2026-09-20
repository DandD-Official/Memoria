import { v2Svg, v2Bounds, type DiagramImages } from "@/lib/diagrams/svg-v2";
import type { PersistedDiagramData } from "@/lib/diagrams/schema";
import { edgeGeometry } from "@/lib/diagrams/geometry";
export { edgeGeometry } from "@/lib/diagrams/geometry";
import { legacyShapeMarkup as shapeMarkup } from "@/lib/diagrams/geometry";
import type { DiagramData, DiagramNode, DiagramEdge } from "@/lib/diagrams/schema";

export const DIAGRAM_VIEWBOX = { width: 900, height: 560 } as const;

export interface DiagramBounds { x: number; y: number; width: number; height: number }

/** Expands the drawing area around every node so moving an object beyond the
 * starter frame never clips it in the editor or in exports. */
export function getDiagramBounds(data: PersistedDiagramData, padding = 64): DiagramBounds {
  if (data.version === 2) return v2Bounds(data, padding);
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

export function diagramToSvg(data: PersistedDiagramData, images: DiagramImages = {}): string {
  if (data.version === 2) return v2Svg(data, images, node => diagramNodeMarkup(node as DiagramNode));
  const bounds = getDiagramBounds(data);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"><defs>${diagramArrow()}</defs>${data.edges.map(edge => diagramEdgeMarkup(edge, data)).join("")}${data.nodes.map(diagramNodeMarkup).join("")}</svg>`;
}
