import type { NodeV2, Point } from "@/lib/diagrams/schema";
import { center, ports, rotatePoint } from "@/lib/diagrams/geometry";
export type Handle = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w"|"rotate";
export function Handles({node,scale,start,port}:{node:NodeV2;scale:number;start:(event:React.PointerEvent,handle:Handle)=>void;port:(event:React.PointerEvent,id:string)=>void}) {
  const points:{id:Handle;x:number;y:number}[]=[{id:"nw",x:0,y:0},{id:"n",x:.5,y:0},{id:"ne",x:1,y:0},{id:"e",x:1,y:.5},{id:"se",x:1,y:1},{id:"s",x:.5,y:1},{id:"sw",x:0,y:1},{id:"w",x:0,y:.5}];
  const c=center(node); const size=44/scale;
  return <g fill="rgb(var(--color-surface))" stroke="rgb(var(--color-accent-dark))" strokeWidth={1.5/scale}>
    <rect x={node.x-4} y={node.y-4} width={node.width+8} height={node.height+8} transform={`rotate(${node.rotation} ${c.x} ${c.y})`} fill="none" strokeDasharray="5 4" pointerEvents="none"/>
    {!node.locked&&points.map(p=>{const point=rotatePoint({x:node.x+p.x*node.width,y:node.y+p.y*node.height},c,node.rotation);return <g key={p.id} onPointerDown={event=>start(event,p.id)} className={`cursor-${p.id}-resize`}><rect x={point.x-size/2} y={point.y-size/2} width={size} height={size} fill="transparent" stroke="none"/><rect x={point.x-4/scale} y={point.y-4/scale} width={8/scale} height={8/scale} pointerEvents="none"/></g>;})}
    {!node.locked&&<g onPointerDown={event=>start(event,"rotate")} className="cursor-grab"><circle cx={c.x} cy={node.y-36/scale} r={22/scale} fill="transparent" stroke="none"/><circle cx={c.x} cy={node.y-36/scale} r={5/scale}/></g>}
    {ports(node).map(p=><g key={p.id} data-node={node.id} data-port={p.id} onPointerDown={event=>port(event,p.id)} className="cursor-crosshair" transform={`translate(${(p.x-c.x)*.12} ${(p.y-c.y)*.12})`}><circle cx={p.x} cy={p.y} r={22/scale} fill="transparent" stroke="none"/><circle cx={p.x} cy={p.y} r={5/scale} fill="rgb(var(--color-accent-dark))"/></g>)}
  </g>;
}
export function PointHandle({point,scale,label,start}:{point:Point;scale:number;label:string;start:(e:React.PointerEvent)=>void}) {return <g aria-label={label} onPointerDown={start} className="cursor-move"><circle cx={point.x} cy={point.y} r={22/scale} fill="transparent"/><circle cx={point.x} cy={point.y} r={5/scale} fill="rgb(var(--color-surface))" stroke="rgb(var(--color-accent-dark))" strokeWidth={2/scale}/></g>;}
