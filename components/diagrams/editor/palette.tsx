"use client";
import { useState } from "react";
import { SHAPE_REGISTRY } from "@/lib/diagrams/shapes";
import { ICONS } from "@/lib/diagrams/icons";
export function Palette({add,upload}:{add:(shape:string)=>void;upload:(file:File)=>void}){
  const [query,setQuery]=useState("");const entries=Object.values(SHAPE_REGISTRY).filter(shape=>shape.label.includes(query.toLowerCase()));
  return <div className="space-y-4 p-3"><label className="block text-xs text-ink-soft">Find a shape<input className="mt-1 min-h-11 w-full rounded-control border border-line bg-surface px-3 text-base text-ink" value={query} onChange={e=>setQuery(e.target.value)} type="search"/></label>
    {[...new Set(entries.map(e=>e.category))].map(category=><details key={category} open={Boolean(query)||category==="Basic"}><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">{category}</summary><div className="grid grid-cols-2 gap-1">{entries.filter(s=>s.category===category).map(shape=><button key={shape.id} type="button" draggable onDragStart={event=>event.dataTransfer.setData("text/memoria-shape",shape.id)} onClick={()=>add(shape.id)} className="min-h-11 rounded-control border border-line px-2 py-2 text-xs capitalize text-ink hover:bg-surface-muted">{shape.label}</button>)}</div></details>)}
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">Icons</summary><div className="grid grid-cols-4 gap-1">{Object.entries(ICONS).filter(([id])=>id.includes(query.toLowerCase())).map(([id,d])=><button type="button" key={id} aria-label={`Add ${id} icon`} title={id} className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-line text-ink hover:bg-surface-muted" onClick={()=>add(`icon:${id}`)}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={d}/></svg></button>)}</div></details>
    <label className="block text-xs text-ink-soft">Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="mt-2 min-h-11 max-w-full text-xs" onChange={e=>{const file=e.target.files?.[0];if(file)upload(file);e.target.value="";}}/></label>
  </div>;
}
