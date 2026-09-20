"use client";
import { memo } from "react";
import type { EdgeV2 } from "@/lib/diagrams/schema";
import { MARKER_PATHS, markerFilled, dashArray, type routeEdge } from "@/lib/diagrams/routing";
export const EdgeView = memo(function EdgeView({ edge, route, paper, selected, select, edit, bend }: { edge:EdgeV2;route:ReturnType<typeof routeEdge>;paper:string;selected:boolean;select:(id:string)=>void;edit:(id:string)=>void;bend:(id:string,event:React.MouseEvent)=>void }) {
  return <g role="button" tabIndex={0} aria-label={`Connection${edge.label?`: ${edge.label}`:""}`} aria-pressed={selected} onClick={event=>{event.stopPropagation();select(edge.id);}} onDoubleClick={event=>{event.stopPropagation();bend(edge.id,event);}} onKeyDown={event=>{if(event.key==="Enter"){event.stopPropagation();edit(edge.id);}if(event.key===" "){event.preventDefault();select(edge.id);}} className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-dark">
    <defs>{(["source","target"] as const).map(end=>{const kind=edge[`${end}Marker`];return kind==="none"?null:<marker key={end} id={`marker-${edge.id}-${end}`} viewBox="-1 -1 16 12" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d={MARKER_PATHS[kind]} fill={markerFilled(kind)?edge.color:paper} stroke={edge.color}/></marker>;})}</defs>
    <path d={route.path} fill="none" stroke="transparent" strokeWidth="22"/>
    <path d={route.path} fill="none" stroke={edge.color} strokeWidth={edge.width+(selected?1:0)} strokeDasharray={dashArray(edge.dash)} markerStart={edge.sourceMarker!=="none"?`url(#marker-${edge.id}-source)`:undefined} markerEnd={edge.targetMarker!=="none"?`url(#marker-${edge.id}-target)`:undefined}/>
    {edge.label&&<text x={route.x} y={route.y-9} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={edge.labelStyle?.fontSize??12} fill={edge.labelStyle?.color??"#22312b"} fontWeight={edge.labelStyle?.bold?700:400} fontStyle={edge.labelStyle?.italic?"italic":"normal"} stroke={paper} strokeWidth="5" paintOrder="stroke" onDoubleClick={event=>{event.stopPropagation();edit(edge.id);}}>{edge.label}</text>}
  </g>;
});
