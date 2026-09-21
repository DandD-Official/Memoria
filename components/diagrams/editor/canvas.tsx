"use client";
import { useCallback,useEffect,useRef,useState,type PointerEvent } from "react";
import type { DiagramDataV2,NodeV2,Point,Endpoint } from "@/lib/diagrams/schema";
import { routeEdge } from "@/lib/diagrams/routing";
import { center } from "@/lib/diagrams/geometry";
import { moveNodes,snapGuides,adoptContainers,snapConnect,connect,reconnect,newNode } from "@/lib/diagrams/editing";
import type { DiagramBounds } from "@/lib/diagrams/svg";
import type { DiagramImages } from "@/lib/diagrams/svg-v2";
import { NodeView } from "./node-view";
import { EdgeView } from "./edge-view";
import { Handles,PointHandle,type Handle } from "./handles";
import { Minimap } from "./minimap";
import { ContextMenu } from "./context-menu";
import { TextOverlay } from "./text-overlay";

type Gesture={kind:"move"|"resize"|"rotate"|"pan"|"marquee"|"connect"|"endpoint"|"bend"|"label";start:Point;client:Point;before:DiagramDataV2;ids:string[];camera:DiagramBounds;handle?:Handle;source?:Endpoint;edge?:string;end?:"source"|"target";bend?:number;shift?:boolean};
interface Props {data:DiagramDataV2;images:DiagramImages;selection:string[];select:(ids:string[])=>void;change:(data:DiagramDataV2)=>void;camera:DiagramBounds;setCamera:(camera:DiagramBounds)=>void;tool:"select"|"pan"|"text"|"connect";snapConnectEnabled:boolean;grid:boolean;act:(action:string)=>void;announce:(message:string)=>void;disabled:boolean;add:(shape:string,point?:Point)=>void;zoom:(factor:number)=>void}
export function Canvas(props:Props){
  const {snapConnectEnabled,data,images,selection,select,change,camera,setCamera,tool,grid,act,announce,disabled,add,zoom}=props;
  const svg=useRef<SVGSVGElement>(null),host=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),previewRef=useRef<DiagramDataV2|null>(null),raf=useRef<number>(0),longPress=useRef<ReturnType<typeof setTimeout>>();
  const pointers=useRef(new Map<number,Point>()),pinch=useRef<{distance:number;camera:DiagramBounds;mid:Point}>(),space=useRef(false);
  const [preview,setPreview]=useState<DiagramDataV2|null>(null),[marquee,setMarquee]=useState<DiagramBounds|null>(null),[connection,setConnection]=useState<{source:Endpoint;point:Point}|null>(null),[pending,setPending]=useState<{source:Endpoint;point:Point}|null>(null);
  const [guides,setGuides]=useState<{axis:"x"|"y";value:number}[]>([]),[context,setContext]=useState<Point|null>(null),[editing,setEditing]=useState<string|null>(null),[keyboardSource,setKeyboardSource]=useState<string|null>(null);
  const shown=preview??data;const scale=svg.current?.getScreenCTM()?.a??1;
  useEffect(()=>()=>{cancelAnimationFrame(raf.current);clearTimeout(longPress.current);},[]);
  useEffect(()=>{
    const element=svg.current;if(!element)return;
    const wheel=(event:WheelEvent)=>{event.preventDefault();if(event.ctrlKey||event.metaKey)zoom(event.deltaY>0?1.1:1/1.1);else{const s=element.getScreenCTM()?.a??1;setCamera({...camera,x:camera.x+event.deltaX/s,y:camera.y+event.deltaY/s});}};
    element.addEventListener("wheel",wheel,{passive:false});return()=>element.removeEventListener("wheel",wheel);
  },[camera,setCamera,zoom]);
  const point=(event:{clientX:number;clientY:number}):Point=>new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
  const endpoint=(event:{clientX:number;clientY:number}):Endpoint=>{const target=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-node]");const nodeId=target?.getAttribute("data-node");const portId=target?.getAttribute("data-port") as "top"|"right"|"bottom"|"left"|undefined;return nodeId?{nodeId,...(portId?{portId}:{})}:point(event);};
  const transient=(next:DiagramDataV2)=>{previewRef.current=next;if(!raf.current)raf.current=requestAnimationFrame(()=>{setPreview(previewRef.current);raf.current=0;});};
  function start(event:React.PointerEvent,kind:Gesture["kind"],extra:Partial<Gesture>={}){
    if(disabled||event.button>1)return;event.preventDefault();event.stopPropagation();setContext(null);svg.current?.focus();
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),camera,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};gesture.current=null;previewRef.current=null;setPreview(null);return;}
    gesture.current={kind:space.current||event.button===1?"pan":kind,start:point(event),client:{x:event.clientX,y:event.clientY},before:data,ids:selection,camera,...extra};
    svg.current?.setPointerCapture(event.pointerId);
    if(event.pointerType==="touch"){clearTimeout(longPress.current);longPress.current=setTimeout(()=>{gesture.current=null;const rect=host.current!.getBoundingClientRect();setContext({x:Math.min(event.clientX-rect.left,rect.width-200),y:Math.min(event.clientY-rect.top,rect.height-410)});},600);}
  }
  const beginNode=useCallback((event:PointerEvent<SVGGElement>,node:NodeV2)=>{
    if(keyboardSource){change(connect(data,{nodeId:keyboardSource},{nodeId:node.id}));setKeyboardSource(null);announce(`Connected to ${node.label||node.shape}`);event.stopPropagation();return;}
    const ids=event.shiftKey||event.ctrlKey||event.metaKey?selection.includes(node.id)?selection.filter(id=>id!==node.id):[...selection,node.id]:selection.includes(node.id)?selection:[node.id];select(ids);
    if(tool==="connect"){start(event,"connect",{source:{nodeId:node.id},ids});setConnection({source:{nodeId:node.id},point:point(event)});}
    else start(event,tool==="pan"?"pan":"move",{ids});
    // Stable memoized nodes only update when selection/document/tool changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data,selection,tool,keyboardSource,disabled,camera]);
  function move(event:PointerEvent<SVGSVGElement>){
    if(pointers.current.has(event.pointerId))pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch.current&&pointers.current.size>=2){const [a,b]=[...pointers.current.values()],p=pinch.current;const ratio=p.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));const width=Math.max(250,Math.min(10000,p.camera.width*ratio)),height=width*p.camera.height/p.camera.width;setCamera({...p.camera,width,height,x:p.camera.x+(p.camera.width-width)/2-((a.x+b.x)/2-p.mid.x)/scale,y:p.camera.y+(p.camera.height-height)/2-((a.y+b.y)/2-p.mid.y)/scale});return;}
    const g=gesture.current;if(!g)return;const p=point(event);let dx=p.x-g.start.x,dy=p.y-g.start.y;
    if(Math.hypot(event.clientX-g.client.x,event.clientY-g.client.y)>5)clearTimeout(longPress.current);
    if(g.kind==="pan"){setCamera({...g.camera,x:g.camera.x-(event.clientX-g.client.x)/scale,y:g.camera.y-(event.clientY-g.client.y)/scale});return;}
    if(g.kind==="marquee"){setMarquee({x:Math.min(p.x,g.start.x),y:Math.min(p.y,g.start.y),width:Math.abs(dx),height:Math.abs(dy)});return;}
    if(g.kind==="connect"){setConnection({source:g.source!,point:p});return;}
    if(g.kind==="endpoint"){transient(reconnect(g.before,g.edge!,g.end!,p));return;}
    if(g.kind==="bend"){transient({...g.before,edges:g.before.edges.map(e=>e.id===g.edge?{...e,legacy:false,waypoints:e.waypoints.map((v,i)=>i===g.bend?p:v)}:e)});return;}
    if(g.kind==="label"){const edge=g.before.edges.find(e=>e.id===g.edge)!;const route=routeEdge(edge,g.before);const ab={x:route.b.x-route.a.x,y:route.b.y-route.a.y};const t=Math.max(0,Math.min(1,((p.x-route.a.x)*ab.x+(p.y-route.a.y)*ab.y)/(ab.x*ab.x+ab.y*ab.y||1)));transient({...g.before,edges:g.before.edges.map(e=>e.id===g.edge?{...e,labelPosition:t,legacy:false}:e)});return;}
    if(g.kind==="move"){if(grid){dx=Math.round(dx/20)*20;dy=Math.round(dy/20)*20;}const snap=snapGuides(g.before,g.ids,dx,dy,6/scale);setGuides(snap.guides);transient(moveNodes(g.before,g.ids,snap.dx,snap.dy));return;}
    transient({...g.before,nodes:g.before.nodes.map(n=>{if(!g.ids.includes(n.id)||n.locked)return n;const c=center(n);if(g.kind==="rotate")return {...n,legacy:false,rotation:Math.round(Math.atan2(p.y-c.y,p.x-c.x)*180/Math.PI+90)%360};let x=n.x,y=n.y,w=n.width,h=n.height;const handle=g.handle!;if(handle.includes("e"))w+=dx;if(handle.includes("s"))h+=dy;if(handle.includes("w")){w-=dx;x+=dx;}if(handle.includes("n")){h-=dy;y+=dy;}if(event.shiftKey&&handle.length===2)h=w*n.height/n.width;return {...n,legacy:false,x:w<30?n.x:x,y:h<30?n.y:y,width:Math.min(10000,Math.max(30,w)),height:Math.min(10000,Math.max(30,h))};})});
  }
  function end(event:PointerEvent<SVGSVGElement>,cancel=false){
    clearTimeout(longPress.current);pointers.current.delete(event.pointerId);if(pointers.current.size<2)pinch.current=undefined;
    if(svg.current?.hasPointerCapture(event.pointerId))svg.current.releasePointerCapture(event.pointerId);const g=gesture.current;gesture.current=null;
    cancelAnimationFrame(raf.current);raf.current=0;
    if(!cancel&&g){
      if(g.kind==="marquee"&&marquee)select(g.before.nodes.filter(n=>n.x>=marquee.x&&n.y>=marquee.y&&n.x+n.width<=marquee.x+marquee.width&&n.y+n.height<=marquee.y+marquee.height).map(n=>n.id));
      else if(g.kind==="connect"){const target=endpoint(event);if("nodeId" in target){change(connect(g.before,g.source!,target));announce("Connected two shapes");}else setPending({source:g.source!,point:target});}
      else if(g.kind==="endpoint")change(reconnect(g.before,g.edge!,g.end!,endpoint(event)));
      else if(previewRef.current){let next=g.kind==="move"?adoptContainers(previewRef.current,g.ids):previewRef.current;if(snapConnectEnabled&&g.kind==="move"&&g.ids.length===1)next=snapConnect(next,g.ids[0]);change(next);}
    }
    previewRef.current=null;setPreview(null);setMarquee(null);setConnection(null);setGuides([]);
  }
  const edit=useCallback((id:string)=>setEditing(id),[]);
  const nodeKey=useCallback((event:React.KeyboardEvent,node:NodeV2)=>{if(event.key==="Enter"){event.stopPropagation();if(keyboardSource){change(connect(data,{nodeId:keyboardSource},{nodeId:node.id}));setKeyboardSource(null);announce("Connected shapes");}else setEditing(node.id);}if(event.key===" "){event.preventDefault();select([node.id]);}},[keyboardSource,data,change,announce,select]);
  const index=new Map(shown.nodes.map(n=>[n.id,n]));const ordered=[...shown.nodes].sort((a,b)=>a.z-b.z);const chosen=shown.nodes.filter(n=>selection.includes(n.id));const selectedEdge=shown.edges.find(e=>selection.includes(e.id));
  const edited=shown.nodes.find(n=>n.id===editing)??shown.edges.find(e=>e.id===editing);
  const editPoint=edited&&"x" in edited?center(edited):edited?{x:routeEdge(edited,shown).x,y:routeEdge(edited,shown).y}:{x:0,y:0};
  const matrix=svg.current?.getScreenCTM();const screen=matrix?new DOMPoint(editPoint.x,editPoint.y).matrixTransform(matrix):{x:0,y:0};const rect=host.current?.getBoundingClientRect();
  return <div ref={host} className="relative h-[60dvh] min-h-[340px] max-h-[680px] min-w-0 flex-1 overflow-hidden rounded-card border border-line bg-[rgb(var(--color-diagram-canvas))]" onContextMenu={event=>{event.preventDefault();const r=host.current!.getBoundingClientRect();setContext({x:Math.max(0,Math.min(event.clientX-r.left,r.width-200)),y:Math.max(0,Math.min(event.clientY-r.top,r.height-410))});}}>
    <svg ref={svg} className="h-full min-h-0 w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-dark" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} role="group" aria-label="Diagram canvas" tabIndex={0} onPointerDown={event=>{if(tool==="text"){add("text",point(event));return;}select([]);start(event,tool==="pan"?"pan":"marquee");}} onPointerMove={move} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onDoubleClick={event=>{if(event.target===svg.current)add("text",point(event));}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();add(event.dataTransfer.getData("text/memoria-shape"),point(event));}} onKeyDown={event=>{
      if(event.key===" "){space.current=true;event.preventDefault();}if(event.key==="Escape"){setKeyboardSource(null);setPending(null);setContext(null);}
      if(event.key.toLowerCase()==="c"&&!event.ctrlKey&&!event.metaKey&&selection[0]){setKeyboardSource(selection[0]);announce("Choose a target with arrow keys, then press Enter");event.preventDefault();event.stopPropagation();}
      if(keyboardSource&&event.key.startsWith("Arrow")){const i=data.nodes.findIndex(n=>n.id===selection[0]);select([data.nodes[(i+(event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:1)+data.nodes.length)%data.nodes.length].id]);event.preventDefault();event.stopPropagation();}
      if(keyboardSource&&event.key==="Enter"&&selection[0]){change(connect(data,{nodeId:keyboardSource},{nodeId:selection[0]}));setKeyboardSource(null);announce("Connected shapes");event.stopPropagation();}
    }} onKeyUp={event=>{if(event.key===" ")space.current=false;}}>
      <defs><pattern id="memoria-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="rgb(var(--color-line-strong))"/></pattern></defs>
      {grid&&<rect {...camera} fill="url(#memoria-grid)" pointerEvents="none"/>}
      {ordered.filter(n=>n.kind==="container").map(node=><NodeView key={node.id} node={node} images={images} selected={selection.includes(node.id)} onPointerDown={beginNode} onEdit={edit} onKeyDown={nodeKey}/>)}
      {shown.edges.map(edge=><EdgeView key={edge.id} edge={edge} route={routeEdge(edge,shown,index)} paper={data.paper} selected={selection.includes(edge.id)} select={id=>select([id])} edit={edit} bend={(id,event)=>{const p=point(event);change({...data,edges:data.edges.map(e=>e.id===id?{...e,legacy:false,waypoints:[...e.waypoints,p]}:e)});}}/>)}
      {ordered.filter(n=>n.kind!=="container").map(node=><NodeView key={node.id} node={node} images={images} selected={selection.includes(node.id)} onPointerDown={beginNode} onEdit={edit} onKeyDown={nodeKey}/>)}
      {chosen.map(node=><Handles key={node.id} node={node} scale={scale} start={(event,handle)=>start(event,handle==="rotate"?"rotate":"resize",{ids:[node.id],handle})} port={(event,id)=>{const source={nodeId:node.id,portId:id as "top"};start(event,"connect",{source});setConnection({source,point:point(event)});}}/>)}
      {selectedEdge&&(()=>{const route=routeEdge(selectedEdge,shown,index);return <g><PointHandle point={route.a} scale={scale} label="Reconnect source" start={event=>start(event,"endpoint",{edge:selectedEdge.id,end:"source"})}/><PointHandle point={route.b} scale={scale} label="Reconnect target" start={event=>start(event,"endpoint",{edge:selectedEdge.id,end:"target"})}/>{selectedEdge.waypoints.map((p,i)=><PointHandle key={i} point={p} scale={scale} label={`Move bend ${i+1}`} start={event=>start(event,"bend",{edge:selectedEdge.id,bend:i})}/>)}<PointHandle point={{x:route.x,y:route.y-15}} scale={scale} label="Move connection label" start={event=>start(event,"label",{edge:selectedEdge.id})}/></g>;})()}
      {connection&&(()=>{const n="nodeId" in connection.source?index.get(connection.source.nodeId):undefined;const from=n?center(n):connection.point;return <path d={`M ${from.x} ${from.y} L ${connection.point.x} ${connection.point.y}`} fill="none" stroke="rgb(var(--color-accent-dark))" strokeWidth="2" strokeDasharray="6 4" pointerEvents="none"/>;})()}
      {marquee&&<rect {...marquee} fill="rgb(var(--color-accent) / .2)" stroke="rgb(var(--color-accent-dark))" pointerEvents="none"/>}
      {guides.map((g,i)=><line key={i} x1={g.axis==="x"?g.value:camera.x} x2={g.axis==="x"?g.value:camera.x+camera.width} y1={g.axis==="y"?g.value:camera.y} y2={g.axis==="y"?g.value:camera.y+camera.height} stroke="rgb(var(--color-diagram-guide))" strokeWidth={1/scale} pointerEvents="none"/>)}
    </svg>
    {selection.length>0&&<div className="absolute left-1/2 top-2 flex max-w-[95%] -translate-x-1/2 flex-wrap justify-center rounded-control border border-line bg-surface p-1 shadow-card" aria-label="Selection tools">{["Edit label","Duplicate","Bring to front","Delete"].map(label=><button key={label} type="button" className="min-h-11 px-2 text-xs text-ink" onClick={()=>label==="Edit label"?setEditing(selection[0]):act(label)}>{label}</button>)}</div>}
    <div className="absolute bottom-3 left-3 flex items-end gap-2"><Minimap data={shown} camera={camera} navigate={(x,y)=>setCamera({...camera,x:x-camera.width/2,y:y-camera.height/2})}/><div className="flex rounded-control border border-line bg-surface"><button type="button" aria-label="Zoom out" className="h-11 w-11" onClick={()=>zoom(1.2)}>−</button><button type="button" aria-label="Zoom in" className="h-11 w-11" onClick={()=>zoom(1/1.2)}>+</button></div></div>
    {pending&&<div className="absolute inset-x-3 bottom-28 z-20 rounded-card border border-line bg-surface p-3 shadow-card"><p className="text-sm text-ink">Create a connected shape</p><div className="flex flex-wrap">{(["rectangle","diamond","circle","text"] as const).map(shape=><button type="button" key={shape} className="min-h-11 px-3 text-sm capitalize" onClick={()=>{const n=newNode(shape,pending.point);change(connect({...data,nodes:[...data.nodes,n]},pending.source,{nodeId:n.id}));select([n.id]);setPending(null);announce("Created connected shape");}}>{shape}</button>)}<button type="button" className="min-h-11 px-3" onClick={()=>{change(connect(data,pending.source,pending.point));setPending(null);}}>Keep free end</button><button type="button" className="min-h-11 px-3" onClick={()=>setPending(null)}>Cancel</button></div></div>}
    {context&&<ContextMenu {...context} act={act} close={()=>setContext(null)}/>}
    {edited&&<TextOverlay key={editing} value={edited.label??""} x={Math.min((screen.x-(rect?.left??0)),(rect?.width??260)-250)} y={screen.y-(rect?.top??0)} cancel={()=>setEditing(null)} commit={label=>{change({...data,nodes:data.nodes.map(n=>n.id===editing?{...n,label,legacy:false}:n),edges:data.edges.map(e=>e.id===editing?{...e,label:label.slice(0,500)}:e)});setEditing(null);}}/>}
  </div>;
}
