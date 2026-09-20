import { diagramDataV2Schema, type DiagramDataV2, type NodeV2, type Endpoint, type Point } from "@/lib/diagrams/schema";
import { SHAPE_REGISTRY, type ShapeId } from "@/lib/diagrams/shapes";
export function newNode(shape: ShapeId, point: Point, id = crypto.randomUUID()): NodeV2 {
  return { id, shape, ...point, width: ["actor", "icon"].includes(shape) ? 80 : 180, height: ["class", "interface"].includes(shape) ? 180 : shape === "actor" ? 140 : 100,
    label: ["icon", "image", "line", "divider"].includes(shape) ? "" : SHAPE_REGISTRY[shape].label, kind: SHAPE_REGISTRY[shape].container ? "container" : shape === "text" || shape === "label" ? "text" : shape === "sticky" ? "note" : shape === "icon" ? "icon" : shape === "image" ? "image" : "shape",
    rotation: 0, locked: false, z: 0, style: { fill: shape === "sticky" ? "#f3e5a2" : "#f7f7ef", stroke: "#2b4837", textColor: "#22312b" }, ...(shape === "icon" ? { iconId: "book" } : {}), ...(shape === "class" ? { compartments: ["Class", "+ attribute: Type", "+ method(): Type"] } : {}),
  };
}
export function descendants(data: DiagramDataV2, ids: string[]): Set<string> {
  const all = new Set(ids); let changed = true;
  while (changed) { changed=false; for (const node of data.nodes) if (node.parentId && all.has(node.parentId) && !all.has(node.id)) { all.add(node.id); changed=true; } }
  return all;
}
export function moveNodes(data: DiagramDataV2, ids: string[], dx: number, dy: number): DiagramDataV2 {
  const selected = descendants(data, ids.filter(id => !data.nodes.find(node => node.id===id)?.locked));
  return { ...data, nodes: data.nodes.map(node => selected.has(node.id) ? { ...node, x:node.x+dx, y:node.y+dy } : node), edges: data.edges.map(edge => "nodeId" in edge.source && "nodeId" in edge.target && selected.has(edge.source.nodeId) && selected.has(edge.target.nodeId) ? { ...edge, waypoints: edge.waypoints.map(p => ({ x:p.x+dx,y:p.y+dy })) } : edge) };
}
export function removeItems(data: DiagramDataV2, ids: string[]): DiagramDataV2 {
  const removed = descendants(data, ids.filter(id => !data.nodes.find(node => node.id===id)?.locked));
  return { ...data, nodes: data.nodes.filter(node => !removed.has(node.id)), edges: data.edges.filter(edge => !removed.has(edge.id) && !("nodeId" in edge.source && removed.has(edge.source.nodeId)) && !("nodeId" in edge.target && removed.has(edge.target.nodeId))) };
}
export function connect(data: DiagramDataV2, source: Endpoint, target: Endpoint, id = crypto.randomUUID()): DiagramDataV2 {
  return diagramDataV2Schema.parse({ ...data, edges: [...data.edges,{ id,source,target }] });
}
export function snapConnect(data: DiagramDataV2, id: string): DiagramDataV2 {
  const node=data.nodes.find(n=>n.id===id);if(!node)return data;
  const candidates=data.nodes.filter(n=>n.id!==id&&n.kind!=="container").flatMap(parent=>[{x:parent.x+parent.width+80,y:parent.y},{x:parent.x,y:parent.y+parent.height+80}].map(point=>({parent,point,distance:Math.hypot(node.x-point.x,node.y-point.y)}))).sort((a,b)=>a.distance-b.distance);
  const target=candidates[0];if(!target||target.distance>65)return data;
  const next=moveNodes(data,[id],target.point.x-node.x,target.point.y-node.y);
  if(data.edges.some(e=>"nodeId" in e.source&&"nodeId" in e.target&&((e.source.nodeId===id&&e.target.nodeId===target.parent.id)||(e.target.nodeId===id&&e.source.nodeId===target.parent.id))))return next;
  return connect(next,{nodeId:target.parent.id},{nodeId:id});
}
export function reconnect(data: DiagramDataV2, edgeId: string, end: "source" | "target", endpoint: Endpoint): DiagramDataV2 {
  return diagramDataV2Schema.parse({ ...data, edges:data.edges.map(edge => edge.id===edgeId ? { ...edge,[end]:endpoint,legacy:false } : edge) });
}
export function adoptContainers(data: DiagramDataV2, ids: string[]): DiagramDataV2 {
  return { ...data, nodes:data.nodes.map(node => {
    if (!ids.includes(node.id) || node.locked) return node;
    const children=descendants(data,[node.id]);
    const parent=data.nodes.filter(other => other.kind==="container" && !children.has(other.id) && node.x>=other.x && node.y>=other.y+24 && node.x+node.width<=other.x+other.width && node.y+node.height<=other.y+other.height).sort((a,b)=>a.width*a.height-b.width*b.height)[0];
    return { ...node,parentId:parent?.id };
  }) };
}
export function groupNodes(data: DiagramDataV2, ids: string[]): DiagramDataV2 {
  const nodes=data.nodes.filter(node => ids.includes(node.id)); if (!nodes.length) return data;
  const x=Math.min(...nodes.map(n=>n.x))-20,y=Math.min(...nodes.map(n=>n.y))-44;
  const group={ ...newNode("frame",{x,y}),kind:"container" as const,label:"Group",width:Math.max(...nodes.map(n=>n.x+n.width))-x+20,height:Math.max(...nodes.map(n=>n.y+n.height))-y+20,z:Math.min(...nodes.map(n=>n.z))-1 };
  return { ...data,nodes:[group,...data.nodes.map(node=>ids.includes(node.id)?{...node,parentId:group.id}:node)] };
}
export function ungroupNodes(data: DiagramDataV2, ids: string[]): DiagramDataV2 {
  const groups = new Set(data.nodes.filter(node=>ids.includes(node.id)&&node.kind==="container"&&!node.locked).map(node=>node.id));
  return { ...data,nodes:data.nodes.filter(node=>!groups.has(node.id)).map(node=>node.parentId&&groups.has(node.parentId)?{...node,parentId:undefined}:node),edges:data.edges.filter(edge=>!("nodeId" in edge.source&&groups.has(edge.source.nodeId))&&!("nodeId" in edge.target&&groups.has(edge.target.nodeId))) };
}
export type Arrangement = "left" | "center" | "right" | "top" | "middle" | "bottom" | "distribute-x" | "distribute-y" | "same-size";
export function arrangeSelection(data: DiagramDataV2, ids: string[], action: Arrangement): DiagramDataV2 {
  const nodes=data.nodes.filter(n=>ids.includes(n.id)&&!n.locked); if(nodes.length<2)return data;
  const left=Math.min(...nodes.map(n=>n.x)),right=Math.max(...nodes.map(n=>n.x+n.width)),top=Math.min(...nodes.map(n=>n.y)),bottom=Math.max(...nodes.map(n=>n.y+n.height));
  const axis=action==="distribute-y"?"y":"x",dimension=axis==="x"?"width":"height",sorted=[...nodes].sort((a,b)=>a[axis]-b[axis]);
  const gap=((axis==="x"?right-left:bottom-top)-nodes.reduce((sum,n)=>sum+n[dimension],0))/(nodes.length-1);let cursor=axis==="x"?left:top;const positions=new Map<string,number>();
  for(const node of sorted){positions.set(node.id,cursor);cursor+=node[dimension]+gap;}
  let next=data;
  for(const n of nodes){let x=n.x,y=n.y;if(action==="left")x=left;if(action==="center")x=(left+right-n.width)/2;if(action==="right")x=right-n.width;if(action==="top")y=top;if(action==="middle")y=(top+bottom-n.height)/2;if(action==="bottom")y=bottom-n.height;if(action==="distribute-x")x=positions.get(n.id)!;if(action==="distribute-y")y=positions.get(n.id)!;next=moveNodes(next,[n.id],x-n.x,y-n.y);}
  return action==="same-size"?{...next,nodes:next.nodes.map(n=>ids.includes(n.id)&&!n.locked?{...n,width:nodes[0].width,height:nodes[0].height}:n)}:next;
}
export function zOrder(data: DiagramDataV2, ids: string[], action: "front" | "back" | "forward" | "backward"): DiagramDataV2 {
  const sorted=[...data.nodes].sort((a,b)=>a.z-b.z),selected=sorted.filter(n=>ids.includes(n.id)),rest=sorted.filter(n=>!ids.includes(n.id));
  let ordered=action==="front"?[...rest,...selected]:action==="back"?[...selected,...rest]:sorted;
  if(action==="forward"||action==="backward") { ordered=[...sorted]; const direction=action==="forward"?1:-1; const indices=ordered.map((_,i)=>i);if(direction===1)indices.reverse();for(const i of indices){const j=i+direction;if(ids.includes(ordered[i].id)&&ordered[j]&&!ids.includes(ordered[j].id))[ordered[i],ordered[j]]=[ordered[j],ordered[i]];} }
  const ranks=new Map(ordered.map((n,i)=>[n.id,i]));return {...data,nodes:data.nodes.map(n=>({...n,z:ranks.get(n.id)!}))};
}
export function snapGuides(data: DiagramDataV2, ids: string[], dx: number, dy: number, tolerance=6) {
  const node=data.nodes.find(n=>ids.includes(n.id));if(!node)return {dx,dy,guides:[] as {axis:"x"|"y";value:number}[]};
  const guides:{axis:"x"|"y";value:number}[]=[];const moved=descendants(data,ids);
  for(const axis of ["x","y"] as const){const dimension=axis==="x"?"width":"height";let best=tolerance;let correction=0;let guide:number|undefined;
    for(const other of data.nodes){if(moved.has(other.id))continue;for(const f of [0,.5,1])for(const g of [0,.5,1]){const value=other[axis]+other[dimension]*g;const delta=value-(node[axis]+node[dimension]*f+(axis==="x"?dx:dy));if(Math.abs(delta)<best){best=Math.abs(delta);correction=delta;guide=value;}}}
    if(guide!==undefined){if(axis==="x")dx+=correction;else dy+=correction;guides.push({axis,value:guide});}
  }return {dx,dy,guides};
}
export function copySelection(data: DiagramDataV2, ids: string[]): string {
  const selected=descendants(data,ids);
  return JSON.stringify({...data,nodes:data.nodes.filter(n=>selected.has(n.id)).map(n=>({...n,parentId:n.parentId&&selected.has(n.parentId)?n.parentId:undefined})),edges:data.edges.filter(e=>"nodeId" in e.source&&"nodeId" in e.target&&selected.has(e.source.nodeId)&&selected.has(e.target.nodeId))});
}
export function pasteSelection(data: DiagramDataV2, json: string, offset=40): { data: DiagramDataV2; ids: string[] } {
  if(json.length>2_000_000)throw Error("Clipboard diagram is too large.");
  const copied=diagramDataV2Schema.parse(JSON.parse(json)); const map=new Map(copied.nodes.map(n=>[n.id,crypto.randomUUID()]));
  const end=(p:Endpoint):Endpoint=>"nodeId" in p?{...p,nodeId:map.get(p.nodeId)!}:{x:p.x+offset,y:p.y+offset};
  const nodes=copied.nodes.map(n=>({...n,id:map.get(n.id)!,parentId:n.parentId?map.get(n.parentId):undefined,x:n.x+offset,y:n.y+offset,z:data.nodes.length+n.z}));
  const edges=copied.edges.map(e=>({...e,id:crypto.randomUUID(),source:end(e.source),target:end(e.target),waypoints:e.waypoints.map(p=>({x:p.x+offset,y:p.y+offset}))}));
  return {data:diagramDataV2Schema.parse({...data,nodes:[...data.nodes,...nodes],edges:[...data.edges,...edges]}),ids:nodes.map(n=>n.id)};
}
