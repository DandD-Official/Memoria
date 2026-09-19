import { emptyDiagramData, type DiagramData, type DiagramNode } from "@/lib/diagrams/schema";

export const snap = (value: number, enabled = true) => enabled ? Math.round(value / 20) * 20 : Math.round(value);
const uid = () => crypto.randomUUID();

export function addConnectedNode(data: DiagramData, shape: DiagramNode["shape"], parentId?: string, direction: "right" | "down" = "right") {
  const parent = data.nodes.find(node => node.id === parentId);
  const node: DiagramNode = { id: uid(), shape, x: parent ? parent.x + (direction === "right" ? parent.width + 100 : 0) : 80 + data.nodes.length % 3 * 260,
    y: parent ? parent.y + (direction === "down" ? parent.height + 100 : 0) : 80 + Math.floor(data.nodes.length / 3) * 180,
    width: shape === "circle" ? 100 : 180, height: shape === "circle" || shape === "diamond" ? 100 : 80,
    label: parent ? "Next idea" : "Main idea", style: { fill: "#f7f7ef", stroke: "#2b4837", fontSize: 16 } };
  while (data.nodes.some(other => Math.abs(other.x - node.x) < node.width + 20 && Math.abs(other.y - node.y) < node.height + 20)) node.y += 160;
  return { node, data: { ...data, nodes: [...data.nodes, node], edges: parent ? [...data.edges, { id: uid(), source: parent.id, target: node.id, directional: true }] : data.edges } };
}

/** Drop near a node to align and attach. Avoid self-links and duplicate links. */
export function attachNearby(data: DiagramData, nodeId: string): DiagramData {
  const node = data.nodes.find(item => item.id === nodeId);
  if (!node) return data;
  const candidates = data.nodes.filter(item => item.id !== nodeId).map(parent => {
    const targets = [{ x: parent.x + parent.width + 80, y: parent.y }, { x: parent.x, y: parent.y + parent.height + 80 }];
    const point = targets.sort((a, b) => Math.hypot(node.x - a.x, node.y - a.y) - Math.hypot(node.x - b.x, node.y - b.y))[0];
    return { parent, point, distance: Math.hypot(node.x - point.x, node.y - point.y) };
  }).sort((a, b) => a.distance - b.distance);
  const target = candidates[0];
  if (!target || target.distance > 65) return data;
  const already = data.edges.some(edge => edge.source === target.parent.id && edge.target === node.id || edge.source === node.id && edge.target === target.parent.id);
  return { ...data, nodes: data.nodes.map(item => item.id === nodeId ? { ...item, ...target.point } : item), edges: already ? data.edges : [...data.edges, { id: uid(), source: target.parent.id, target: nodeId, directional: true }] };
}

/** Stable layered layout; cycles and disconnected nodes remain visible. */
export function arrangeDiagram(data: DiagramData, direction: "right" | "down" = "right"): DiagramData {
  const levels = new Map<string, number>();
  const incoming = new Set(data.edges.map(edge => edge.target));
  const queue = data.nodes.filter(node => !incoming.has(node.id)).map(node => node.id);
  if (!queue.length && data.nodes.length) queue.push(data.nodes[0].id);
  queue.forEach(id => levels.set(id, 0));
  for (let i = 0; i < queue.length; i++) for (const edge of data.edges.filter(edge => edge.source === queue[i])) if (!levels.has(edge.target)) {
    levels.set(edge.target, (levels.get(queue[i]) ?? 0) + 1); queue.push(edge.target);
  }
  let unconnectedLevel = Math.max(0, ...levels.values()) + 1;
  data.nodes.forEach(node => { if (!levels.has(node.id)) levels.set(node.id, unconnectedLevel++); });
  const positions = new Map<number, number>();
  const stepX = Math.max(180, ...data.nodes.map(node => node.width)) + 110;
  const stepY = Math.max(80, ...data.nodes.map(node => node.height)) + 90;
  return { ...data, nodes: data.nodes.map(node => {
    const level = levels.get(node.id)!; const row = positions.get(level) ?? 0; positions.set(level, row + 1);
    return { ...node, x: 80 + (direction === "right" ? level : row) * stepX, y: 80 + (direction === "right" ? row : level) * stepY };
  }) };
}

export function diagramTemplate(kind: "flow" | "mindmap"): DiagramData {
  let data = emptyDiagramData();
  const root = addConnectedNode(data, "rounded-rectangle"); data = root.data;
  data.nodes[0].label = kind === "flow" ? "Start here" : "Central idea";
  let parent = root.node.id;
  for (const label of kind === "flow" ? ["Explore", "Understand", "Remember"] : ["What?", "Why?", "How?"]) {
    const result = addConnectedNode(data, "rounded-rectangle", kind === "flow" ? parent : root.node.id);
    result.node.label = label; data = result.data; parent = result.node.id;
  }
  return arrangeDiagram(data);
}
