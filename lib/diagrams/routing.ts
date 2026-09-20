import type { DiagramDataV2, EdgeV2, Endpoint, NodeV2, Point } from "@/lib/diagrams/schema";
import { center, perimeter, ports, edgeGeometry } from "@/lib/diagrams/geometry";
export function endpointPoint(end: Endpoint, nodes: Map<string, NodeV2>, toward: Point): Point {
  if (!("nodeId" in end)) return end;
  const node = nodes.get(end.nodeId); if (!node) return toward;
  if (end.portId === "center") return center(node);
  return ports(node).find(port => port.id === end.portId) ?? perimeter(node, toward);
}
export function routeEdge(edge: EdgeV2, data: DiagramDataV2, index = new Map(data.nodes.map(node => [node.id, node]))) {
  const sourceNode = "nodeId" in edge.source ? index.get(edge.source.nodeId) : undefined;
  const targetNode = "nodeId" in edge.target ? index.get(edge.target.nodeId) : undefined;
  const sourceCenter = sourceNode ? center(sourceNode) : "x" in edge.source ? edge.source : { x: 0, y: 0 };
  const targetCenter = targetNode ? center(targetNode) : "x" in edge.target ? edge.target : { x: 0, y: 0 };
  const a = endpointPoint(edge.source, index, targetCenter), b = endpointPoint(edge.target, index, sourceCenter);
  if (edge.legacy && sourceNode && targetNode && !edge.waypoints.length && edge.routing === "orthogonal") return { ...edgeGeometry(sourceNode, targetNode), a, b, points: [a,b] };
  let points: Point[];
  if (sourceNode && sourceNode === targetNode && !edge.waypoints.length) {
    const right = ports(sourceNode)[1], top = ports(sourceNode)[0];
    points = [right, { x: right.x+60, y: right.y }, { x: right.x+60, y: top.y-60 }, { x: top.x, y: top.y-60 }, top];
  } else if (edge.waypoints.length) points = [a, ...edge.waypoints, b];
  else if (edge.routing === "orthogonal") {
    const horizontal = Math.abs(b.x-a.x) >= Math.abs(b.y-a.y);
    points = horizontal ? [a, { x: (a.x+b.x)/2, y: a.y }, { x: (a.x+b.x)/2, y: b.y }, b] : [a, { x: a.x, y: (a.y+b.y)/2 }, { x: b.x, y: (a.y+b.y)/2 }, b];
  } else points = [a,b];
  let path = points.map((p,i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  if (edge.routing === "curved" && points.length === 2) path = `M ${a.x} ${a.y} C ${(a.x+b.x)/2} ${a.y} ${(a.x+b.x)/2} ${b.y} ${b.x} ${b.y}`;
  const lengths = points.slice(1).map((p,i) => Math.hypot(p.x-points[i].x,p.y-points[i].y));
  let distance = lengths.reduce((sum,n) => sum+n,0)*edge.labelPosition; let label = a;
  for (let i=0; i<lengths.length; i++) { if (distance <= lengths[i]) { const t=distance/(lengths[i] || 1); label={ x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t }; break; } distance-=lengths[i]; }
  if (edge.routing === "curved" && points.length === 2) { const t=edge.labelPosition,s=1-t,cx=(a.x+b.x)/2; label={ x:s*s*s*a.x+3*s*s*t*cx+3*s*t*t*cx+t*t*t*b.x,y:s*s*s*a.y+3*s*s*t*a.y+3*s*t*t*b.y+t*t*t*b.y }; }
  return { path, x: label.x, y: label.y, a: points[0], b: points.at(-1)!, points };
}
export const MARKER_PATHS: Record<EdgeV2["targetMarker"], string> = {
  none: "", arrow: "M0 0L10 5L0 10Z", "open-arrow": "M0 0L10 5L0 10", block: "M0 0H10V10H0Z", triangle: "M0 0L10 5L0 10Z",
  diamond: "M0 5L5 0L10 5L5 10Z", "diamond-filled": "M0 5L5 0L10 5L5 10Z", circle: "M0 5a5 5 0 1 0 10 0a5 5 0 1 0-10 0", cross: "M1 1L9 9M1 9L9 1",
  one: "M5 0V10", many: "M0 0L10 5L0 10M0 5H10", "zero-one": "M0 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0M10 0V10", "zero-many": "M0 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0M6 0L14 5L6 10M6 5H14",
};
export const markerFilled = (marker: string) => ["arrow", "block", "diamond-filled"].includes(marker);
export const dashArray = (dash: string) => dash === "dotted" ? "2 5" : dash === "dashed" ? "6 4" : undefined;
