"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, Copy, Download, Hand, Maximize2, MousePointer2, Plus, Redo2, Save, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emptyDiagramData, SHAPE_TYPES, diagramDataSchema, type DiagramData, type DiagramNode } from "@/lib/diagrams/schema";
import { diagramArrow, diagramEdgeMarkup, diagramNodeMarkup, diagramToSvg, getDiagramBounds, type DiagramBounds } from "@/lib/diagrams/svg";
import { addConnectedNode, arrangeDiagram, attachNearby, diagramTemplate, snap } from "@/lib/diagrams/workspace";

type Summary = { id: string; title: string; updatedAt: string };
type Gesture = { kind: "move" | "resize" | "pan"; x: number; y: number; clientX: number; clientY: number; before: DiagramData; ids: string[]; camera: DiagramBounds; scale: number };
const control = "h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink";
const signature = (title: string, data: DiagramData) => JSON.stringify([title, data]);

export function DiagramEditor({ initialDiagrams, initialDiagramId, onInsert, onDirtyChange }: { initialDiagrams: Summary[]; initialDiagramId?: string; onInsert?: (id: string) => void; onDirtyChange?: (dirty: boolean) => void }) {
  const initial = initialDiagrams.find(item => item.id === initialDiagramId) ?? initialDiagrams[0];
  const [diagrams, setDiagrams] = useState(initialDiagrams);
  // Only an opened document gets a write target. A failed initial fetch must
  // never leave an empty canvas capable of overwriting the existing diagram.
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "Untitled diagram");
  const [data, setData] = useState<DiagramData>(emptyDiagramData);
  const [saved, setSaved] = useState(() => signature(initial?.title ?? "Untitled diagram", emptyDiagramData()));
  const [history, setHistory] = useState<DiagramData[]>([]), [future, setFuture] = useState<DiagramData[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [camera, setCamera] = useState<DiagramBounds>({ x: 0, y: 0, width: 1000, height: 620 });
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [grid, setGrid] = useState(true), [autoConnect, setAutoConnect] = useState(true);
  const [shape, setShape] = useState<DiagramNode["shape"]>("rounded-rectangle");
  const [loading, setLoading] = useState(Boolean(initial)), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const svg = useRef<SVGSVGElement>(null), gesture = useRef<Gesture | null>(null);
  const latest = useRef(data); latest.current = data;
  const request = useRef<AbortController | null>(null);
  const marker = `arrow-${useId().replaceAll(":", "")}`;
  const selected = data.nodes.find(node => node.id === selection[0]);
  const dirty = saved !== signature(title, data), busy = loading || saving;

  useEffect(() => {
    if (initial) void load(initial.id);
    return () => request.current?.abort();
    // Subsequent choices are loaded by the saved-diagram control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect); return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  function change(next: DiagramData, before = data) {
    if (JSON.stringify(next) === JSON.stringify(before)) return;
    setHistory(items => [...items.slice(-59), before]); setFuture([]); setData(next); setMessage("");
  }
  function update(patch: Partial<DiagramNode>) { change({ ...data, nodes: data.nodes.map(node => selection.includes(node.id) ? { ...node, ...patch } : node) }); }
  function style(patch: NonNullable<DiagramNode["style"]>) { change({ ...data, nodes: data.nodes.map(node => selection.includes(node.id) ? { ...node, style: { ...node.style, ...patch } } : node) }); }
  function fit(next = data) { setCamera(getDiagramBounds(next)); }
  function zoom(factor: number) { setCamera(current => { const width = Math.min(12000, Math.max(250, current.width * factor)), height = width * current.height / current.width; return { x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height }; }); }
  function add(direction: "right" | "down" = "right") {
    if (data.nodes.length >= 500 || data.edges.length >= 1000) { setError("This diagram has reached its size limit. Start a second diagram."); return; }
    const result = addConnectedNode(data, shape, autoConnect ? selection[0] : undefined, direction);
    change(result.data); setSelection([result.node.id]); fit(result.data);
  }
  function remove() { change({ ...data, nodes: data.nodes.filter(node => !selection.includes(node.id)), edges: data.edges.filter(edge => !selection.includes(edge.source) && !selection.includes(edge.target)) }); setSelection([]); }
  function duplicate() {
    if (data.nodes.length + selection.length > 500) { setError("Too many nodes to duplicate. Start a second diagram."); return; }
    const ids = new Map(selection.map(id => [id, crypto.randomUUID()]));
    const nodes = data.nodes.filter(node => ids.has(node.id)).map(node => ({ ...node, id: ids.get(node.id)!, x: node.x + 40, y: node.y + 40 }));
    const edges = data.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)).map(edge => ({ ...edge, id: crypto.randomUUID(), source: ids.get(edge.source)!, target: ids.get(edge.target)! }));
    if (data.edges.length + edges.length > 1000) return;
    change({ ...data, nodes: [...data.nodes, ...nodes], edges: [...data.edges, ...edges] }); setSelection(nodes.map(node => node.id));
  }
  function undo() { const previous = history.at(-1); if (previous) { setFuture(items => [...items, data]); setHistory(items => items.slice(0, -1)); setData(previous); setSelection([]); } }
  function redo() { const next = future.at(-1); if (next) { setHistory(items => [...items, data]); setFuture(items => items.slice(0, -1)); setData(next); setSelection([]); } }
  function arrange(direction: "right" | "down") { const next = arrangeDiagram(data, direction); change(next); fit(next); }
  function align(axis: "x" | "y") { if (selected) update({ [axis]: selected[axis] }); }
  function template(kind: "flow" | "mindmap") {
    if (data.nodes.length && !window.confirm("Replace this canvas with a template? You can undo this change.")) return;
    const next = diagramTemplate(kind); change(next); setSelection([next.nodes[0].id]); fit(next);
  }
  function discard() { return !dirty || window.confirm("Discard unsaved changes to this diagram?"); }
  function fresh() { if (!discard()) return; request.current?.abort(); setId(null); setTitle("Untitled diagram"); setData(emptyDiagramData()); setSaved(signature("Untitled diagram", emptyDiagramData())); setHistory([]); setFuture([]); setSelection([]); setError(""); setMessage(""); fit(emptyDiagramData()); }
  async function load(nextId: string) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/diagrams/${encodeURIComponent(nextId)}`, { signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body.diagram) throw new Error(body.error ?? "Could not open this diagram.");
      const diagram = body.diagram, next = diagramDataSchema.parse(diagram.data);
      if (controller.signal.aborted) return;
      setId(diagram.id); setTitle(diagram.title); setData(next); setSaved(signature(diagram.title, next)); setHistory([]); setFuture([]); setSelection([]); setMessage(""); fit(next);
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not open this diagram."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  async function save(insert = false) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(id ? `/api/diagrams/${id}` : "/api/diagrams", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() || "Untitled diagram", data }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.diagram) throw new Error(result?.error ?? "Could not save this diagram. Please try again.");
      const diagram = result.diagram, next = diagramDataSchema.parse(diagram.data);
      setId(diagram.id); setTitle(diagram.title); setData(next); setSaved(signature(diagram.title, next));
      setDiagrams(items => [{ id: diagram.id, title: diagram.title, updatedAt: diagram.updatedAt }, ...items.filter(item => item.id !== diagram.id)]);
      void fetch(`/api/diagrams/${diagram.id}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(diagramToSvg(next))))}` }) }).catch(() => {});
      setMessage("All changes saved"); if (insert) onInsert?.(diagram.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this diagram."); }
    finally { setSaving(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([diagramToSvg(data)], { type: "image/svg+xml" }));
    const link = document.createElement("a"); link.href = url; link.download = `${title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "diagram"}.svg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyEmbed() {
    try { await navigator.clipboard.writeText(`:::diagram{id="${id}"}\n:::`); setMessage("Diagram reference copied. Paste it into a memory."); }
    catch { setError("Clipboard access is unavailable. Use the Diagram button in your memory editor to insert this diagram."); }
  }
  function point(event: PointerEvent) { return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse()); }
  function start(event: PointerEvent, node?: DiagramNode, resize = false) {
    if (busy || event.button !== 0) return;
    event.stopPropagation(); event.preventDefault(); svg.current?.focus();
    const p = point(event); let ids = selection;
    if (node && tool === "select") {
      ids = event.shiftKey ? selection.includes(node.id) ? selection.filter(id => id !== node.id) : [...selection, node.id] : selection.includes(node.id) ? selection : [node.id];
      setSelection(ids);
    } else if (tool === "select") { setSelection([]); ids = []; }
    gesture.current = { kind: resize ? "resize" : node && tool === "select" ? "move" : "pan", x: p.x, y: p.y, clientX: event.clientX, clientY: event.clientY, before: data, ids, camera, scale: svg.current!.getScreenCTM()!.a };
    svg.current!.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current; if (!current) return;
    if (current.kind === "pan") { setCamera({ ...current.camera, x: current.camera.x - (event.clientX - current.clientX) / current.scale, y: current.camera.y - (event.clientY - current.clientY) / current.scale }); return; }
    const p = point(event), dx = p.x - current.x, dy = p.y - current.y;
    setData({ ...current.before, nodes: current.before.nodes.map(node => !current.ids.includes(node.id) ? node : current.kind === "resize" ? { ...node, width: Math.max(60, Math.min(2000, snap(node.width + dx, grid))), height: Math.max(40, Math.min(2000, snap(node.height + dy, grid))) } : { ...node, x: snap(node.x + dx, grid), y: snap(node.y + dy, grid) }) });
  }
  function end(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    const current = gesture.current; gesture.current = null;
    if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    if (!current || current.kind === "pan") return;
    if (cancelled) { setData(current.before); return; }
    let next = latest.current;
    if (autoConnect && current.kind === "move" && current.ids.length === 1 && next.edges.length < 1000 && JSON.stringify(next) !== JSON.stringify(current.before)) next = attachNearby(next, current.ids[0]);
    change(next, current.before);
  }
  function keyboard(event: KeyboardEvent) {
    if (busy || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
    else if (modifier && event.key.toLowerCase() === "a") { event.preventDefault(); setSelection(data.nodes.map(node => node.id)); }
    else if (modifier && event.key.toLowerCase() === "d") { event.preventDefault(); duplicate(); }
    else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); remove(); }
    else if (event.key === "Escape") setSelection([]);
    else if (event.key.startsWith("Arrow") && selection.length && event.target === svg.current) {
      event.preventDefault(); const step = event.shiftKey ? 20 : 1;
      change({ ...data, nodes: data.nodes.map(node => selection.includes(node.id) ? { ...node, x: node.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: node.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) } : node) });
    }
  }

  return <section onKeyDown={keyboard} className="min-w-0 space-y-4" aria-label="Diagram workspace">
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-[160px] flex-1 text-xs font-medium text-ink-soft">Diagram title<input aria-label="Diagram title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} disabled={busy} className={`${control} mt-1`} /></label><Button variant="outline" disabled={busy} onClick={fresh}><Plus className="h-4 w-4" />New</Button><Button loading={saving} disabled={loading} onClick={() => void save()}><Save className="h-4 w-4" />Save</Button>{onInsert && <Button disabled={busy} onClick={() => void save(true)}>Save & insert into memory</Button>}</div>
    <div className="flex flex-wrap items-center gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-soft">Saved diagrams<select aria-label="Saved diagrams" className={`${control} max-w-sm`} value={id ?? ""} disabled={busy} onChange={event => { if (event.target.value && discard()) void load(event.target.value); }}><option value="">New diagram</option>{diagrams.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><span className="text-xs text-ink-soft" role="status">{loading ? "Opening diagram…" : dirty ? "Unsaved changes" : message || "Ready"}</span></div>
    {error && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-3"><legend className="sr-only">Diagram tools</legend>
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-3">
        <Button size="sm" variant={tool === "select" ? "primary" : "ghost"} aria-label="Select tool" aria-pressed={tool === "select"} onClick={() => setTool("select")}><MousePointer2 className="h-4 w-4" /></Button><Button size="sm" variant={tool === "pan" ? "primary" : "ghost"} aria-label="Pan tool" aria-pressed={tool === "pan"} onClick={() => setTool("pan")}><Hand className="h-4 w-4" /></Button>
        <select aria-label="New node shape" className={`${control} !w-auto`} value={shape} onChange={event => setShape(event.target.value as DiagramNode["shape"])}>{SHAPE_TYPES.map(shape => <option key={shape} value={shape}>{shape.replaceAll("-", " ")}</option>)}</select>
        <Button size="sm" variant="outline" onClick={() => add()}><ArrowRight className="h-4 w-4" />{selected && autoConnect ? "Add connected step" : "Add idea"}</Button><Button size="sm" variant="ghost" onClick={() => add("down")}><ArrowDown className="h-4 w-4" />Branch below</Button>
        <label className="flex min-h-10 items-center gap-2 px-2 text-xs"><input type="checkbox" checked={autoConnect} onChange={event => setAutoConnect(event.target.checked)} />Auto-connect</label><label className="flex min-h-10 items-center gap-2 px-2 text-xs"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />Snap to grid</label>
      </div>
      <div className="flex flex-wrap items-center gap-1"><Button size="sm" variant="ghost" aria-label="Undo" disabled={!history.length} onClick={undo}><Undo2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" aria-label="Redo" disabled={!future.length} onClick={redo}><Redo2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" aria-label="Duplicate selected nodes" disabled={!selection.length} onClick={duplicate}><Copy className="h-4 w-4" /></Button><Button size="sm" variant="ghost" aria-label="Delete selected nodes" disabled={!selection.length} onClick={remove}><Trash2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => arrange("right")}>Arrange →</Button><Button size="sm" variant="ghost" onClick={() => arrange("down")}>Arrange ↓</Button><Button size="sm" variant="ghost" onClick={() => template("flow")}>Flow template</Button><Button size="sm" variant="ghost" onClick={() => template("mindmap")}>Mind map</Button><div className="ml-auto flex"><Button size="sm" variant="ghost" aria-label="Zoom out" onClick={() => zoom(1.2)}><ZoomOut className="h-4 w-4" /></Button><Button size="sm" variant="ghost" aria-label="Fit diagram" onClick={() => fit()}><Maximize2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" aria-label="Zoom in" onClick={() => zoom(1 / 1.2)}><ZoomIn className="h-4 w-4" /></Button></div></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="relative min-w-0 overflow-hidden rounded-card border border-line-strong bg-[#f7f7ef] shadow-sm">
          <svg ref={svg} viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} className={`block h-[560px] w-full touch-none ${tool === "pan" ? "cursor-grab" : ""}`} role="group" aria-label="Diagram canvas" aria-describedby={`${marker}-help`} tabIndex={busy ? -1 : 0} onPointerDown={event => start(event)} onPointerMove={move} onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)}>
            <defs dangerouslySetInnerHTML={{ __html: diagramArrow(marker) + `<pattern id="${marker}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#ccd3bf"/></pattern>` }} />
            {grid && <rect x={camera.x} y={camera.y} width={camera.width} height={camera.height} fill={`url(#${marker}-grid)`} />}
            <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: data.edges.map(edge => diagramEdgeMarkup(edge, data, marker)).join("") }} />
            {data.nodes.map(node => <g key={node.id} role="button" tabIndex={busy ? -1 : 0} aria-label={`Select ${node.label || "idea"}`} aria-pressed={selection.includes(node.id)} className="cursor-move focus:outline focus:outline-2 focus:outline-[#68882f]" onPointerDown={event => start(event, node)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelection([node.id]); svg.current?.focus(); } }}>
              <g pointerEvents="none" dangerouslySetInnerHTML={{ __html: diagramNodeMarkup(node) }} /><rect x={node.x} y={node.y} width={node.width} height={node.height} fill="transparent" />
              {selection.includes(node.id) && <><rect x={node.x - 6} y={node.y - 6} width={node.width + 12} height={node.height + 12} rx="6" fill="none" stroke="#68882f" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none" /><rect x={node.x + node.width - 8} y={node.y + node.height - 8} width="16" height="16" rx="3" fill="#68882f" className="cursor-se-resize" onPointerDown={event => start(event, node, true)} /></>}
            </g>)}
          </svg>
          {!data.nodes.length && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-[#515f53]"><div><p className="font-display text-3xl">Give your ideas room.</p><p className="mt-3 text-sm">Add an idea or start with a template.<br />New steps connect automatically.</p></div></div>}
        </div>
        <aside className="min-w-0 rounded-card border border-line bg-surface p-4"><h2 className="font-display text-xl">{selection.length > 1 ? `${selection.length} ideas selected` : "Idea properties"}</h2>{selected ? <div className="mt-4 space-y-3">
          <label className="block text-xs">Label<textarea aria-label="Node label" maxLength={500} value={selected.label ?? ""} onChange={event => update({ label: event.target.value })} className={`${control} mt-1 !h-20 py-2`} /></label>
          <label className="block text-xs">Shape<select aria-label="Node shape" className={`${control} mt-1`} value={selected.shape} onChange={event => update({ shape: event.target.value as DiagramNode["shape"] })}>{SHAPE_TYPES.map(shape => <option key={shape}>{shape}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2">{(["width", "height"] as const).map(key => <label key={key} className="text-xs capitalize">{key}<input aria-label={`Node ${key}`} className={`${control} mt-1`} type="number" min={40} max={2000} value={selected[key]} onChange={event => { const value = event.target.valueAsNumber; if (Number.isFinite(value) && value >= 40 && value <= 2000) update({ [key]: value }); }} /></label>)}</div>
          <div className="grid grid-cols-3 gap-2">{([['fill', 'Fill', '#f7f7ef'], ['stroke', 'Border', '#2b4837'], ['textColor', 'Text', '#22312b']] as const).map(([key, label, fallback]) => <label key={key} className="text-xs">{label}<input aria-label={`Node ${label.toLowerCase()} color`} type="color" value={selected.style?.[key]?.length === 7 ? selected.style[key] : fallback} onChange={event => style({ [key]: event.target.value })} className="mt-1 h-10 w-full cursor-pointer rounded border border-line" /></label>)}</div>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs">Font size<input aria-label="Node font size" type="number" min={8} max={72} value={selected.style?.fontSize ?? 16} onChange={event => { const n = event.target.valueAsNumber; if (n >= 8 && n <= 72) style({ fontSize: n }); }} className={`${control} mt-1`} /></label><label className="text-xs">Text align<select aria-label="Node text alignment" value={selected.style?.textAlign ?? "center"} onChange={event => style({ textAlign: event.target.value as "left" | "center" | "right" })} className={`${control} mt-1`}><option>left</option><option>center</option><option>right</option></select></label></div>
          <label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={selected.style?.dashed ?? false} onChange={event => style({ dashed: event.target.checked })} />Dashed border</label>
          {selection.length > 1 && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => align("x")}>Align left</Button><Button variant="outline" size="sm" onClick={() => align("y")}>Align top</Button></div>}
          {data.edges.filter(edge => edge.source === selected.id || edge.target === selected.id).map((edge, index) => <div key={edge.id} className="border-t border-line pt-3"><label className="text-xs">Connection {index + 1}<input aria-label={`Connection ${index + 1} label`} maxLength={200} className={`${control} mt-1`} placeholder="Label (optional)" value={edge.label ?? ""} onChange={event => change({ ...data, edges: data.edges.map(item => item.id === edge.id ? { ...item, label: event.target.value } : item) })} /></label><div className="mt-1 flex items-center justify-between"><label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={edge.directional} onChange={event => change({ ...data, edges: data.edges.map(item => item.id === edge.id ? { ...item, directional: event.target.checked } : item) })} />Arrow</label><Button variant="ghost" size="sm" aria-label={`Remove connection ${index + 1}`} onClick={() => change({ ...data, edges: data.edges.filter(item => item.id !== edge.id) })}><Trash2 className="h-3 w-3" /></Button></div></div>)}
        </div> : <p className="mt-3 text-sm leading-relaxed text-ink-soft">Select an idea to change its label, shape, size, or colors. Shift-click to select several ideas.</p>}</aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p id={`${marker}-help`} className="max-w-2xl text-xs leading-relaxed text-ink-soft">Drag ideas to move them. Drop near the right or bottom of another idea to snap and connect. Drag empty space to pan. Arrow keys move a selection; Ctrl/Cmd+Z undoes; Ctrl/Cmd+D duplicates.</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!id || dirty} onClick={() => void copyEmbed()}><Copy className="h-4 w-4" />Copy for memory</Button><Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />SVG</Button></div></div>
    </fieldset>
  </section>;
}
