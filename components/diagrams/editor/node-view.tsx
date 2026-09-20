"use client";
import { memo, type PointerEvent } from "react";
import type { NodeV2 } from "@/lib/diagrams/schema";
import { shapePrimitives, center, nodeText, iconPath } from "@/lib/diagrams/geometry";
import { safeImageUri, type DiagramImages } from "@/lib/diagrams/svg-v2";
import { dashArray } from "@/lib/diagrams/routing";
export const NodeView = memo(function NodeView({ node, images, selected, onPointerDown, onEdit, onKeyDown }: { node: NodeV2; images: DiagramImages; selected: boolean; onPointerDown: (event: PointerEvent<SVGGElement>, node: NodeV2) => void; onEdit: (id: string) => void; onKeyDown: (event: React.KeyboardEvent, node: NodeV2) => void }) {
  const c=center(node),text=nodeText(node),s=node.style??{},primitives=shapePrimitives(node),icon=iconPath(node),image=safeImageUri(node.imageRef?images[node.imageRef]:undefined);
  const shapes=primitives.map((p,i)=>{if(p.tag==="path")return <path key={i} {...p.attrs}/>;if(p.tag==="ellipse")return <ellipse key={i} {...p.attrs}/>;if(p.tag==="circle")return <circle key={i} {...p.attrs}/>;if(p.tag==="line")return <line key={i} {...p.attrs}/>;return <rect key={i} {...p.attrs}/>;});
  return <g data-node={node.id} role="button" tabIndex={0} aria-label={`${node.label||node.shape}${node.locked?", locked":""}`} aria-pressed={selected} onKeyDown={event=>onKeyDown(event,node)} onPointerDown={event=>onPointerDown(event,node)} onDoubleClick={()=>onEdit(node.id)} className="cursor-move outline-none focus-visible:stroke-accent-dark" transform={`rotate(${node.rotation} ${c.x} ${c.y})`} opacity={s.opacity??1} fill={s.gradient?`url(#gradient-${node.id})`:s.fill??"#f7f7ef"} stroke={s.stroke??"#2b4837"} strokeWidth={s.strokeWidth??2} strokeDasharray={dashArray(s.dash??(s.dashed?"dashed":"solid"))}>
    {s.gradient&&<defs><linearGradient id={`gradient-${node.id}`} x2="1" y2="1"><stop stopColor={s.fill??"#f7f7ef"}/><stop offset="1" stopColor={s.gradient}/></linearGradient></defs>}
    {s.shadow&&<g transform="translate(3 4)" fill="#000000" stroke="none" opacity=".12">{shapes}</g>}{shapes}
    {!primitives.length&&<rect x={node.x} y={node.y} width={node.width} height={node.height} fill="transparent" stroke="none"/>}
    {icon&&<path d={icon} transform={`translate(${node.x} ${node.y}) scale(${node.width/24} ${node.height/24})`} fill="none" vectorEffect="non-scaling-stroke"/>}
    {image&&<image x={node.x} y={node.y} width={node.width} height={node.height} href={image} preserveAspectRatio="xMidYMid meet"/>}
    {s.highlight&&<rect x={node.x+8} y={text.y-text.size} width={Math.max(0,node.width-16)} height={text.lines.length*text.step} fill={s.highlight} stroke="none"/>}
    <text fontFamily={text.font} fontSize={text.size} textAnchor={text.anchor as "start"|"middle"|"end"} fill={s.textColor??"#22312b"} stroke="none" fontWeight={s.bold?700:400} fontStyle={s.italic?"italic":"normal"} textDecoration={[s.underline?"underline":"",s.strike?"line-through":""].filter(Boolean).join(" ")||"none"}>{text.lines.map((line,i)=><tspan key={i} x={text.x} y={text.y+i*text.step}>{line}</tspan>)}</text>
  </g>;
});
