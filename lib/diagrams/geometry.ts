import type { DiagramNode, NodeV2, Point } from "@/lib/diagrams/schema";
import { SHAPE_TYPES } from "@/lib/diagrams/schema";
import { ICONS } from "@/lib/diagrams/icons";

export function legacyShapeMarkup(node: DiagramNode): string {
  const { x, y, width: w, height: h } = node;
  if (node.shape === "diamond" || node.shape === "decision") return `<path d="M ${x + w / 2} ${y} L ${x + w} ${y + h / 2} L ${x + w / 2} ${y + h} L ${x} ${y + h / 2} Z"/>`;
  if (node.shape === "parallelogram") return `<path d="M ${x + 18} ${y} h ${w - 18} l -18 ${h} h -${w - 18} Z"/>`;
  if (node.shape === "document") return `<path d="M ${x} ${y} h ${w} v ${h - 12} q -${w / 4} 24 -${w / 2} 0 q -${w / 4} -24 -${w / 2} 0 Z"/>`;
  if (node.shape === "circle" || node.shape === "ellipse") return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
  if (node.shape === "cylinder" || node.shape === "database") return `<path d="M ${x} ${y + 12} a ${w / 2} 12 0 0 1 ${w} 0 v ${h - 24} a ${w / 2} 12 0 0 1 -${w} 0 Z M ${x} ${y + 12} a ${w / 2} 12 0 0 0 ${w} 0"/>`;
  const radius = node.shape === "rounded-rectangle" || node.shape === "terminator" ? Math.min(18, h / 2) : 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/>`;
}

export interface Primitive { tag: "path" | "rect" | "ellipse" | "circle" | "line"; attrs: Record<string, string | number> }
const path = (d: string): Primitive[] => [{ tag: "path", attrs: { d } }];
export function shapePrimitives(node: NodeV2): Primitive[] {
  const { x, y, width: w, height: h, shape } = node;
  if ((SHAPE_TYPES as readonly string[]).includes(shape)) {
    const markup = legacyShapeMarkup(node as DiagramNode);
    return [...markup.matchAll(/<(path|rect|ellipse) ([^>]+)\/>/g)].map(item => ({ tag: item[1] as Primitive["tag"], attrs: Object.fromEntries([...item[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]])) }));
  }
  const rect: Primitive = { tag: "rect", attrs: { x, y, width: w, height: h, rx: node.style?.radius ?? 0 } };
  const poly = (points: number[][]) => path(points.map(([px, py], i) => `${i ? "L" : "M"} ${x + px * w} ${y + py * h}`).join(" ") + " Z");
  if (["text", "label", "icon", "image"].includes(shape)) return [];
  if (["circle", "ellipse", "use-case", "attribute", "key-attribute", "connector", "initial-state", "final-state", "summing-junction", "or"].includes(shape)) {
    const items: Primitive[] = [{ tag: "ellipse", attrs: { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 } }];
    if (shape === "final-state") items.push({ tag: "ellipse", attrs: { cx: x + w / 2, cy: y + h / 2, rx: w * .35, ry: h * .35 } });
    if (["summing-junction", "or"].includes(shape)) items.push(...path(`M ${x + w / 2} ${y} V ${y + h} M ${x} ${y + h / 2} H ${x + w}`));
    return items;
  }
  if (["triangle", "extract"].includes(shape)) return poly([[.5, 0], [1, 1], [0, 1]]);
  if (shape === "right-triangle") return poly([[0, 0], [1, 1], [0, 1]]);
  if (shape === "merge") return poly([[0, 0], [1, 0], [.5, 1]]);
  if (shape === "relationship") return poly([[.5, 0], [1, .5], [.5, 1], [0, .5]]);
  if (["pentagon", "hexagon", "octagon", "star"].includes(shape)) {
    const count = shape === "star" ? 10 : shape === "pentagon" ? 5 : shape === "hexagon" ? 6 : 8;
    return poly(Array.from({ length: count }, (_, i) => { const a = i * Math.PI * 2 / count - Math.PI / 2, r = shape === "star" && i % 2 ? .23 : .5; return [.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]; }));
  }
  if (["data", "manual-input", "trapezoid", "preparation", "off-page"].includes(shape)) return poly(shape === "preparation" ? [[.2, 0], [.8, 0], [1, .5], [.8, 1], [.2, 1], [0, .5]] : shape === "off-page" ? [[0, 0], [1, 0], [1, .7], [.5, 1], [0, .7]] : shape === "manual-input" ? [[0, .25], [1, 0], [1, 1], [0, 1]] : [[.15, 0], [.85, 0], [1, 1], [0, 1]]);
  if (shape === "cross") return poly([[.33, 0], [.67, 0], [.67, .33], [1, .33], [1, .67], [.67, .67], [.67, 1], [.33, 1], [.33, .67], [0, .67], [0, .33], [.33, .33]]);
  if (shape.startsWith("arrow-") || shape === "chevron") {
    const points = shape === "arrow-double" ? [[0, .5], [.25, 0], [.25, .3], [.75, .3], [.75, 0], [1, .5], [.75, 1], [.75, .7], [.25, .7], [.25, 1]] : shape === "chevron" ? [[0, 0], [.65, 0], [1, .5], [.65, 1], [0, 1], [.35, .5]] : [[0, .3], [.65, .3], [.65, 0], [1, .5], [.65, 1], [.65, .7], [0, .7]];
    return poly(points.map(([a, b]) => shape === "arrow-left" ? [1 - a, b] : shape === "arrow-up" ? [b, 1 - a] : shape === "arrow-down" ? [b, a] : [a, b]));
  }
  if (shape === "cloud") return path(`M ${x + .2*w} ${y+h} C ${x-.1*w} ${y+h} ${x-.1*w} ${y+.3*h} ${x+.2*w} ${y+.3*h} C ${x+.2*w} ${y-.1*h} ${x+.7*w} ${y-.1*h} ${x+.8*w} ${y+.3*h} C ${x+1.1*w} ${y+.3*h} ${x+1.1*w} ${y+h} ${x+.8*w} ${y+h} Z`);
  if (shape === "callout") return poly([[0, 0], [1, 0], [1, .75], [.4, .75], [.2, 1], [.2, .75], [0, .75]]);
  if (["note", "sticky"].includes(shape)) return [...poly([[0, 0], [.8, 0], [1, .2], [1, 1], [0, 1]]), ...path(`M ${x+.8*w} ${y} V ${y+.2*h} H ${x+w}`)];
  if (shape === "cube") return [...poly([[.2, 0], [1, 0], [1, .8], [.8, 1], [0, 1], [0, .2]]), ...path(`M ${x} ${y+.2*h} H ${x+.8*w} V ${y+h} M ${x+.8*w} ${y+.2*h} L ${x+w} ${y}`)];
  if (["line", "divider", "lifeline", "bracket", "brace"].includes(shape)) return path(shape === "lifeline" ? `M ${x+w/2} ${y} V ${y+h}` : shape === "bracket" ? `M ${x+w} ${y} H ${x} V ${y+h} H ${x+w}` : shape === "brace" ? `M ${x+w} ${y} Q ${x} ${y} ${x+w/2} ${y+h*.35} Q ${x+w/2} ${y+h*.5} ${x} ${y+h*.5} Q ${x+w/2} ${y+h*.5} ${x+w/2} ${y+h*.65} Q ${x} ${y+h} ${x+w} ${y+h}` : `M ${x} ${y+h/2} H ${x+w}`);
  if (shape === "actor") return [{ tag: "ellipse", attrs: { cx: x+w/2, cy: y+h*.16, rx: w*.17, ry: h*.15 } }, ...path(`M ${x+w/2} ${y+h*.31} V ${y+h*.65} M ${x} ${y+h*.4} H ${x+w} M ${x+w/2} ${y+h*.65} L ${x} ${y+h} M ${x+w/2} ${y+h*.65} L ${x+w} ${y+h}`)];
  if (shape === "delay" || shape === "display") return path(`M ${x} ${y} H ${x+w*.5} A ${w*.5} ${h*.5} 0 0 1 ${x+w*.5} ${y+h} H ${x} Z`);
  if (shape === "stored-data") return path(`M ${x+w} ${y} H ${x+w*.2} Q ${x-w*.2} ${y+h*.5} ${x+w*.2} ${y+h} H ${x+w} Q ${x+w*.6} ${y+h*.5} ${x+w} ${y} Z`);
  if (shape === "multi-document") return [rect, { tag: "rect", attrs: { x: x+8, y: y+8, width: Math.max(1,w-16), height: Math.max(1,h-16) } }];
  if (shape === "package") return [{ tag: "rect", attrs: { x, y, width: w*.4, height: h*.2 } }, { tag: "rect", attrs: { x, y: y+h*.2, width: w, height: h*.8 } }];
  if (["class", "interface", "swimlane", "pool", "component", "predefined-process", "weak-entity"].includes(shape)) {
    if (shape === "weak-entity") return [rect, { tag: "rect", attrs: { x: x+6, y: y+6, width: Math.max(1,w-12), height: Math.max(1,h-12) } }];
    if (shape === "predefined-process") return [rect, ...path(`M ${x+12} ${y} V ${y+h} M ${x+w-12} ${y} V ${y+h}`)];
    return [rect, ...path(`M ${x} ${y+h/3} H ${x+w}${shape === "class" || shape === "interface" ? ` M ${x} ${y+2*h/3} H ${x+w}` : ""}`)];
  }
  return [rect];
}
export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
  return { x: center.x + (point.x-center.x)*c - (point.y-center.y)*s, y: center.y + (point.x-center.x)*s + (point.y-center.y)*c };
}
export const center = (node: Pick<NodeV2, "x" | "y" | "width" | "height">): Point => ({ x: node.x+node.width/2, y: node.y+node.height/2 });
export function ports(node: NodeV2) {
  return ([{ id: "top", x: node.x+node.width/2, y: node.y }, { id: "right", x: node.x+node.width, y: node.y+node.height/2 }, { id: "bottom", x: node.x+node.width/2, y: node.y+node.height }, { id: "left", x: node.x, y: node.y+node.height/2 }] as const).map(port => ({ ...port, ...rotatePoint(port, center(node), node.rotation) }));
}
export function perimeter(node: NodeV2, toward: Point): Point {
  const c = center(node), local = rotatePoint(toward, c, -node.rotation); const dx = local.x-c.x, dy = local.y-c.y;
  if (!dx && !dy) return ports(node)[1];
  const elliptical = ["circle", "ellipse", "use-case", "attribute", "key-attribute", "connector"].includes(node.shape);
  const diamond = ["diamond", "decision", "relationship"].includes(node.shape);
  const divisor = elliptical ? Math.hypot(dx/(node.width/2), dy/(node.height/2)) : diamond ? Math.abs(dx)/(node.width/2)+Math.abs(dy)/(node.height/2) : Math.max(Math.abs(dx)/(node.width/2), Math.abs(dy)/(node.height/2));
  return rotatePoint({ x: c.x+dx/divisor, y: c.y+dy/divisor }, c, node.rotation);
}
export function wrapText(text: string, width: number, size: number): string[] {
  const limit = Math.max(1, Math.floor(width / (size*.62))); const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "", weight = 0;
    for (const char of paragraph) { const advance = char.codePointAt(0)! > 255 ? 1.7 : 1; if (weight+advance > limit && line) { lines.push(line); line=""; weight=0; } line += char; weight += advance; }
    lines.push(line);
  }
  return lines;
}
export const FONT_FAMILIES = { sans: "Arial, sans-serif", serif: "Georgia, serif", mono: "Consolas, monospace", handwriting: "Comic Sans MS, cursive" };
export function nodeText(node: NodeV2) {
  const size = node.style?.fontSize ?? 16, padding = node.style?.padding ?? 12;
  const inset = ["diamond", "decision", "relationship", "triangle", "star"].includes(node.shape) ? node.width*.22 : padding;
  const width = Math.max(1, node.width-2*inset), step = size*(node.style?.lineHeight ?? 1.3);
  const label = node.compartments?.join("\n") ?? node.label ?? "";
  const lines = wrapText(label, width, size);
  const capacity = Math.max(1, Math.floor((node.height-padding*2)/step));
  const visible = lines.slice(0, capacity); if (lines.length > capacity) visible[capacity-1] = visible[capacity-1].slice(0,-1)+"…";
  const align = node.style?.textAlign ?? "center";
  const x = align === "left" ? node.x+inset : align === "right" ? node.x+node.width-inset : node.x+node.width/2;
  const top = node.kind === "container" ? node.y+padding : node.style?.verticalAlign === "top" ? node.y+padding : node.style?.verticalAlign === "bottom" ? node.y+node.height-padding-visible.length*step : node.y+(node.height-visible.length*step)/2;
  return { lines: visible, x, y: top+size*.85, step, size, width, anchor: align === "left" ? "start" : align === "right" ? "end" : "middle", font: FONT_FAMILIES[node.style?.fontFamily ?? "sans"] };
}
export function iconPath(node: NodeV2): string | undefined { return node.iconId ? ICONS[node.iconId] : undefined; }


/** Orthogonal connectors meet the shape boundary instead of crossing its label. */
export function edgeGeometry(source: Pick<DiagramNode, "x" | "y" | "width" | "height">, target: Pick<DiagramNode, "x" | "y" | "width" | "height">) {
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

