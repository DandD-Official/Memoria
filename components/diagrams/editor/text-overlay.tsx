"use client";
import { useState,useRef,useEffect } from "react";
export function TextOverlay({value,x,y,commit,cancel}:{value:string;x:number;y:number;commit:(value:string)=>void;cancel:()=>void}) {
  const [text,setText]=useState(value);const done=useRef(false);const ref=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{ref.current?.focus();ref.current?.select();},[]);
  const finish=()=>{if(!done.current){done.current=true;commit(text);}};
  return <textarea ref={ref} aria-label="Edit diagram label" value={text} onChange={e=>setText(e.target.value)} onBlur={finish} onKeyDown={e=>{e.stopPropagation();if(e.key==="Escape"){done.current=true;cancel();}if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();finish();}}} className="absolute z-20 min-h-24 w-60 max-w-[90%] rounded-control border-2 border-accent-dark bg-surface p-3 text-base text-ink shadow-card" style={{left:Math.max(8,x),top:Math.max(8,y)}} maxLength={4000}/>;
}
