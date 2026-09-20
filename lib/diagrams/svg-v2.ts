import type { DiagramDataV2, NodeV2 } from "@/lib/diagrams/schema";
import { shapePrimitives, nodeText, iconPath, center, rotatePoint } from "@/lib/diagrams/geometry";
import { routeEdge, MARKER_PATHS, markerFilled, dashArray } from "@/lib/diagrams/routing";
export const escapeXml = (value: string) => value.replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[char]!));
export const MAX_PREVIEW_CHARS = 2_000_000;
export type DiagramImages = Record<string,string>;
export function v2Bounds(data: DiagramDataV2,padding=64) {
  const points=data.nodes.flatMap(n=>[{x:n.x,y:n.y},{x:n.x+n.width,y:n.y},{x:n.x,y:n.y+n.height},{x:n.x+n.width,y:n.y+n.height}].map(p=>rotatePoint(p,center(n),n.rotation)));
  for(const edge of data.edges){const route=routeEdge(edge,data);points.push(...route.points);}
  const x=Math.min(0,...points.map(p=>p.x))-padding,y=Math.min(0,...points.map(p=>p.y))-padding;
  return {x,y,width:Math.max(900,...points.map(p=>p.x))-x+padding,height:Math.max(560,...points.map(p=>p.y))-y+padding};
}
export function safeImageUri(value: string | undefined): string | undefined { return value && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length<900_000 ? value : undefined; }
export function v2NodeMarkup(node: NodeV2, images: DiagramImages = {}): string {
  const style=node.style??{},c=center(node),text=nodeText(node),icon=iconPath(node),image=safeImageUri(node.imageRef?images[node.imageRef]:undefined);
  const id=`gradient-${node.id}`;
  const defs=style.gradient?`<defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="${style.fill??"#f7f7ef"}"/><stop offset="1" stop-color="${style.gradient}"/></linearGradient></defs>`:"";
  const shapes=shapePrimitives(node).map(p=>`<${p.tag} ${Object.entries(p.attrs).map(([k,v])=>`${k}="${escapeXml(String(v))}"`).join(" ")}/>`).join("");
  const content=icon?`<path d="${icon}" transform="translate(${node.x} ${node.y}) scale(${node.width/24} ${node.height/24})" fill="none" vector-effect="non-scaling-stroke"/>`:image?`<image x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" href="${image}" preserveAspectRatio="xMidYMid meet"/>`:"";
  const label=`<text font-family="${text.font}" font-size="${text.size}" text-anchor="${text.anchor}" fill="${style.textColor??"#22312b"}" stroke="none" font-weight="${style.bold?700:400}" font-style="${style.italic?"italic":"normal"}" text-decoration="${[style.underline?"underline":"",style.strike?"line-through":""].filter(Boolean).join(" ")||"none"}">${text.lines.map((line,i)=>`<tspan x="${text.x}" y="${text.y+i*text.step}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  const highlight=style.highlight?`<rect x="${node.x+8}" y="${text.y-text.size}" width="${Math.max(0,node.width-16)}" height="${text.lines.length*text.step}" fill="${style.highlight}" stroke="none"/>`:"";
  const shadow=style.shadow?`<g transform="translate(3 4)" fill="#000000" stroke="none" opacity=".12">${shapes}</g>`:"";
  return `${defs}<g transform="rotate(${node.rotation} ${c.x} ${c.y})" opacity="${style.opacity??1}" fill="${style.gradient?`url(#${id})`:style.fill??"#f7f7ef"}" stroke="${style.stroke??"#2b4837"}" stroke-width="${style.strokeWidth??2}"${dashArray(style.dash??(style.dashed?"dashed":"solid"))?` stroke-dasharray="${dashArray(style.dash??"dashed")}"`:""}>${shadow}${shapes}${content}${highlight}${label}</g>`;
}
export function v2Svg(data: DiagramDataV2,images:DiagramImages={},legacyNode?:(node:NodeV2)=>string):string {
  const bounds=v2Bounds(data);const nodes=new Map(data.nodes.map(n=>[n.id,n]));
  const edges=data.edges.map(edge=>{const route=routeEdge(edge,data,nodes);const markers=(["source","target"] as const).map(end=>{const kind=edge[`${end}Marker`],id=`marker-${edge.id}-${end}`;return kind==="none"?"":`<marker id="${id}" viewBox="-1 -1 16 12" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="${MARKER_PATHS[kind]}" fill="${markerFilled(kind)?edge.color:data.paper}" stroke="${edge.color}"/></marker>`;}).join("");return `<defs>${markers}</defs><path d="${route.path}" fill="none" stroke="${edge.color}" stroke-width="${edge.width}"${dashArray(edge.dash)?` stroke-dasharray="${dashArray(edge.dash)}"`:""}${edge.sourceMarker!=="none"?` marker-start="url(#marker-${edge.id}-source)"`:""}${edge.targetMarker!=="none"?` marker-end="url(#marker-${edge.id}-target)"`:""}/>${edge.label?`<text x="${route.x}" y="${route.y-9}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${edge.labelStyle?.fontSize??12}" fill="${edge.labelStyle?.color??"#22312b"}" font-weight="${edge.labelStyle?.bold?700:400}" font-style="${edge.labelStyle?.italic?"italic":"normal"}" stroke="${data.paper}" stroke-width="5" paint-order="stroke">${escapeXml(edge.label)}</text>`:""}`;}).join("");
  const ordered=[...data.nodes].sort((a,b)=>a.z-b.z);const node=(n:NodeV2)=>n.legacy&&legacyNode?legacyNode(n):v2NodeMarkup(n,images);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${data.paper}"/>${ordered.filter(n=>n.kind==="container").map(node).join("")}${edges}${ordered.filter(n=>n.kind!=="container").map(node).join("")}</svg>`;
}
