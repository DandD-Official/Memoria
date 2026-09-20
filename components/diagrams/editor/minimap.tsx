import type { DiagramDataV2 } from "@/lib/diagrams/schema";
import { getDiagramBounds,type DiagramBounds } from "@/lib/diagrams/svg";
export function Minimap({data,camera,navigate}:{data:DiagramDataV2;camera:DiagramBounds;navigate:(x:number,y:number)=>void}){
  const bounds=getDiagramBounds(data);
  return <button type="button" aria-label="Center canvas on diagram" onClick={()=>navigate(bounds.x+bounds.width/2,bounds.y+bounds.height/2)} className="h-20 w-28 overflow-hidden rounded-control border border-line bg-surface opacity-90"><svg viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`} className="h-full w-full" aria-hidden="true">{data.nodes.map(n=><rect key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} fill="rgb(var(--color-ink-faint))"/>)}<rect {...camera} fill="rgb(var(--color-accent) / .2)" stroke="rgb(var(--color-accent-dark))" strokeWidth="8"/></svg></button>;
}
