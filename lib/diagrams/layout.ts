import type { DiagramDataV2 } from "@/lib/diagrams/schema";
import { emptyDiagramV2 } from "@/lib/diagrams/schema";
import { connect, newNode } from "@/lib/diagrams/editing";
import type { ShapeId } from "@/lib/diagrams/shapes";
export function layoutDiagram(data: DiagramDataV2, mode: "right" | "down" | "tree" | "radial"): DiagramDataV2 {
  const incoming=new Set(data.edges.flatMap(e=>"nodeId" in e.target?[e.target.nodeId]:[]));
  const adjacency=new Map<string,string[]>();for(const edge of data.edges)if("nodeId" in edge.source&&"nodeId" in edge.target)adjacency.set(edge.source.nodeId,[...(adjacency.get(edge.source.nodeId)??[]),edge.target.nodeId]);
  const levels=new Map<string,number>(),queue=data.nodes.filter(n=>!incoming.has(n.id)).map(n=>n.id);if(!queue.length&&data.nodes.length)queue.push(data.nodes[0].id);queue.forEach(id=>levels.set(id,0));
  for(let i=0;i<queue.length;i++)for(const id of adjacency.get(queue[i])??[])if(!levels.has(id)){levels.set(id,levels.get(queue[i])!+1);queue.push(id);}
  let extra=Math.max(0,...levels.values())+1;data.nodes.forEach(n=>{if(!levels.has(n.id))levels.set(n.id,extra++);});
  const width=Math.max(180,...data.nodes.map(n=>n.width))+120,height=Math.max(100,...data.nodes.map(n=>n.height))+100;
  const groups=new Map<number,string[]>();for(const n of data.nodes){const level=levels.get(n.id)!;groups.set(level,[...(groups.get(level)??[]),n.id]);}
  const radius=Math.max(width,height)*Math.max(2,data.nodes.length/Math.PI);
  return {...data,nodes:data.nodes.map((n,i)=>{
    if(n.locked)return n; const level=levels.get(n.id)!,row=groups.get(level)!.indexOf(n.id);
    if(mode==="radial"){const angle=(i-1)*Math.PI*2/Math.max(1,data.nodes.length-1);return {...n,x:i?radius+radius*Math.cos(angle):radius,y:i?radius+radius*Math.sin(angle):radius};}
    return {...n,x:80+(mode==="right"?level:row)*width,y:80+(mode==="right"?row:level)*height};
  })};
}
export const TEMPLATES = ["Flowchart", "Mind map", "Concept map", "Cycle", "Timeline", "Org chart", "Swimlane", "UML use case", "UML class", "ER diagram", "Sequence"] as const;
export function createTemplate(name: string): DiagramDataV2 {
  let data=emptyDiagramV2();
  const shapes:ShapeId[]=name==="UML class"?["class","interface","class"]:name==="ER diagram"?["entity","relationship","entity"]:name==="UML use case"?["actor","use-case","use-case"]:name==="Sequence"?["lifeline","lifeline","lifeline"]:name==="Flowchart"?["terminator","process","decision","terminator"]:["rounded-rectangle","rounded-rectangle","rounded-rectangle","rounded-rectangle"];
  data.nodes=shapes.map((shape,i)=>({...newNode(shape,{x:80+i*300,y:100}),label:i?`Idea ${i+1}`:"Start here",z:i}));
  for(let i=1;i<data.nodes.length;i++)data=connect(data,{nodeId:data.nodes[name==="Mind map"||name==="Org chart"?0:i-1].id},{nodeId:data.nodes[i].id});
  if(name==="Cycle")data=connect(data,{nodeId:data.nodes.at(-1)!.id},{nodeId:data.nodes[0].id});
  if(name==="Swimlane"){const lane={...newNode("swimlane",{x:30,y:30}),width:1300,height:350,z:-1};data.nodes=[lane,...data.nodes.map(n=>({...n,parentId:lane.id}))];return data;}
  if(name==="Mind map"||name==="Cycle")return layoutDiagram(data,"radial");
  return layoutDiagram(data,name==="Org chart"?"tree":"right");
}
