"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Circle, Copy, Diamond, Maximize2, Plus, Redo2, Save, Square, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { emptyDiagramData, type DiagramData, type DiagramEdge, type DiagramNode } from "@/lib/diagrams/schema";
import { diagramToSvg, getDiagramBounds } from "@/lib/diagrams/svg";

type DiagramSummary = { id: string; title: string; updatedAt: string };
const W = 900;
const H = 560;
const palette = [
  { shape: "rectangle", label: "Rectangle", icon: Square },
  { shape: "rounded-rectangle", label: "Rounded", icon: Square },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "ellipse", label: "Ellipse", icon: Circle },
  { shape: "diamond", label: "Decision", icon: Diamond },
  { shape: "parallelogram", label: "Input", icon: Square },
  { shape: "cylinder", label: "Cylinder", icon: Square },
  { shape: "document", label: "Document", icon: Square },
  { shape: "database", label: "Database", icon: Square },
] as const;

function makeNode(shape: DiagramNode["shape"], index: number): DiagramNode {
  return { id: `node-${Date.now()}-${index}`, shape, x: 100 + (index % 3) * 240, y: 90 + Math.floor(index / 3) * 150, width: 150, height: 70, label: "New step", style: { fill: "#fffaf0", stroke: "#9b7653", strokeWidth: 2, fontSize: 14, textAlign: "center" } };
}

function nodePath(node: DiagramNode): string {
  if (node.shape === "diamond" || node.shape === "decision") return `M ${node.x + node.width / 2} ${node.y} L ${node.x + node.width} ${node.y + node.height / 2} L ${node.x + node.width / 2} ${node.y + node.height} L ${node.x} ${node.y + node.height / 2} Z`;
  if (node.shape === "circle" || node.shape === "ellipse") return "";
  if (node.shape === "parallelogram") return `M ${node.x + 18} ${node.y} h ${node.width - 18} l -18 ${node.height} h -${node.width - 18} Z`;
  if (node.shape === "document") return `M ${node.x} ${node.y} h ${node.width} v ${node.height - 12} q -${node.width / 4} 24 -${node.width / 2} 0 q -${node.width / 4} -24 -${node.width / 2} 0 Z`;
  return `M ${node.x} ${node.y} h ${node.width} v ${node.height} h -${node.width} Z`;
}

function center(node: DiagramNode) { return { x: node.x + node.width / 2, y: node.y + node.height / 2 }; }

export function DiagramEditor({ initialDiagrams, initialDiagramId }: { initialDiagrams: DiagramSummary[]; initialDiagramId?: string }) {
  const initialDiagram = initialDiagrams.find(diagram => diagram.id === initialDiagramId) ?? initialDiagrams[0];
  const [diagrams, setDiagrams] = useState(initialDiagrams);
  const [selectedId, setSelectedId] = useState<string | null>(initialDiagram?.id ?? null);
  const [title, setTitle] = useState(initialDiagram?.title ?? "Untitled diagram");
  const [data, setData] = useState<DiagramData>(emptyDiagramData);
  const [history, setHistory] = useState<DiagramData[]>([]);
  const [future, setFuture] = useState<DiagramData[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; startX: number; startY: number; width: number; height: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => data.nodes.find((node) => node.id === selectedNode), [data.nodes, selectedNode]);

  useEffect(() => { if (selectedId && data.nodes.length === 0) void selectDiagram(selectedId); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(next: DiagramData) { setHistory((items) => [...items.slice(-29), data]); setFuture([]); setData(next); }
  function addNode(shape: DiagramNode["shape"]) { change({ ...data, nodes: [...data.nodes, makeNode(shape, data.nodes.length)] }); }
  function updateNode(id: string, patch: Partial<DiagramNode>) { change({ ...data, nodes: data.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) }); }
  function removeSelected() { if (!selectedNode) return; change({ ...data, nodes: data.nodes.filter((node) => node.id !== selectedNode), edges: data.edges.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode) }); setSelectedNode(null); }
  function duplicateSelected() { if (!selected) return; const copy = { ...selected, id: `node-${Date.now()}`, x: selected.x + 30, y: selected.y + 30 }; change({ ...data, nodes: [...data.nodes, copy] }); setSelectedNode(copy.id); }
  function undo() { const previous = history.at(-1); if (!previous) return; setFuture((items) => [...items, data]); setData(previous); setHistory((items) => items.slice(0, -1)); }
  function redo() { const next = future.at(-1); if (!next) return; setHistory((items) => [...items, data]); setData(next); setFuture((items) => items.slice(0, -1)); }
  function clickNode(id: string) { if (connectFrom && connectFrom !== id) { const edge: DiagramEdge = { id: `edge-${Date.now()}`, source: connectFrom, target: id, directional: true, style: { strokeWidth: 2 } }; change({ ...data, edges: [...data.edges, edge] }); setConnectFrom(null); return; } setSelectedNode(id); }
  function localPoint(event: ReactPointerEvent<SVGSVGElement | SVGGElement>) { const svg = (event.currentTarget.ownerSVGElement ?? event.currentTarget) as SVGSVGElement; const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; const matrix = svg.getScreenCTM(); return matrix?.inverse().transformPoint(point); }
  function pointerDown(event: ReactPointerEvent<SVGGElement>, node: DiagramNode) { const local = localPoint(event); if (!local) return; setHistory((items) => [...items.slice(-29), data]); setFuture([]); setDrag({ id: node.id, dx: local.x - node.x, dy: local.y - node.y }); }
  function resizeStart(event: ReactPointerEvent<SVGRectElement>, node: DiagramNode) { event.stopPropagation(); const local = localPoint(event); if (!local) return; setHistory((items) => [...items.slice(-29), data]); setFuture([]); setResize({ id: node.id, startX: local.x, startY: local.y, width: node.width, height: node.height }); }
  function canvasDown(event: ReactPointerEvent<SVGSVGElement>) { if (event.target !== event.currentTarget) return; setPanDrag({ x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY }); }
  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) { const local = localPoint(event); if (!local) return; if (panDrag) { setPan({ x: panDrag.x - (event.clientX - panDrag.startX) / zoom, y: panDrag.y - (event.clientY - panDrag.startY) / zoom }); return; } if (resize) { setData((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === resize.id ? { ...node, width: Math.max(60, Math.min(2000, resize.width + local.x - resize.startX)), height: Math.max(40, Math.min(1200, resize.height + local.y - resize.startY)) } : node) })); return; } if (!drag) return; setData((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === drag.id ? { ...node, x: Math.max(-5000, Math.min(5000, local.x - drag.dx)), y: Math.max(-5000, Math.min(5000, local.y - drag.dy)) } : node) })); }

  async function save() {
    setSaving(true); setMessage("");
    const body = JSON.stringify({ title: title.trim() || "Untitled diagram", data });
    const response = await fetch(selectedId ? `/api/diagrams/${selectedId}` : "/api/diagrams", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body });
    const result = await response.json().catch(() => null);
    if (response.ok && result?.diagram) {
      const diagram = result.diagram as { id: string; title: string; updatedAt: string; data: DiagramData };
      setSelectedId(diagram.id); setTitle(diagram.title); setData(diagram.data); setDiagrams((items) => [{ id: diagram.id, title: diagram.title, updatedAt: diagram.updatedAt }, ...items.filter((item) => item.id !== diagram.id)]);
      const svg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(diagramToSvg(data))))}`;
      await fetch(`/api/diagrams/${diagram.id}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl: svg }) }).catch(() => {});
      setMessage("Saved");
    } else setMessage(result?.error ?? "Could not save diagram.");
    setSaving(false);
  }

  async function selectDiagram(id: string) { const response = await fetch(`/api/diagrams/${id}`); const result = await response.json().catch(() => null); if (!response.ok || !result?.diagram) return; setSelectedId(id); setTitle(result.diagram.title); setData(result.diagram.data); setHistory([]); setFuture([]); setSelectedNode(null); setMessage(""); }
  const stopPointer = () => { setDrag(null); setResize(null); setPanDrag(null); };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]">
      <aside className="rounded-panel border border-line bg-surface p-3 shadow-card">
        <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow text-ink-faint">Workspace</p><span className="font-display text-lg text-ink">Diagrams</span></div><Tooltip content="New diagram"><button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-soft hover:bg-ink/5 hover:text-ink" onClick={() => { setSelectedId(null); setTitle("Untitled diagram"); setData(emptyDiagramData()); setHistory([]); setFuture([]); setMessage(""); }} aria-label="New diagram"><Plus className="h-4 w-4" aria-hidden="true" /></button></Tooltip></div>
        <div className="space-y-1">{diagrams.length === 0 && <p className="rounded-control border border-dashed border-line p-3 text-xs leading-relaxed text-ink-faint">Start with a blank canvas and save your first visual.</p>}{diagrams.map((diagram) => <button key={diagram.id} type="button" onClick={() => void selectDiagram(diagram.id)} aria-pressed={selectedId === diagram.id} className={`w-full min-w-0 rounded-control px-3 py-2.5 text-left text-sm transition-colors ${selectedId === diagram.id ? "bg-action text-action-foreground shadow-sm" : "text-ink-soft hover:bg-surface-muted hover:text-ink"}`}><span className="block truncate">{diagram.title}</span><span className="mt-0.5 block text-[0.6875rem] opacity-70">Updated {new Date(diagram.updatedAt).toLocaleDateString()}</span></button>)}</div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 text-sm font-medium shadow-sm" aria-label="Diagram title" /><Button size="sm" onClick={() => void save()} loading={saving}><Save className="h-4 w-4" aria-hidden="true" />Save</Button>{message && <span className={`inline-flex items-center gap-1 text-xs ${message === "Saved" ? "text-success" : "text-danger"}`} role="status"><Check className="h-3 w-3" aria-hidden="true" />{message}</span>}</div>
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-1.5 rounded-panel border border-line bg-surface p-2 shadow-sm"><span className="px-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">Add shape</span>{palette.map(({ shape, label, icon: Icon }) => <Tooltip key={shape} content={label}><button type="button" onClick={() => addNode(shape)} aria-label={`Add ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted hover:text-ink"><Icon className="h-4 w-4" aria-hidden="true" /></button></Tooltip>)}<span className="mx-1 h-5 w-px bg-line" aria-hidden="true" /><Tooltip content="Undo"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted disabled:opacity-40" onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 className="h-4 w-4" aria-hidden="true" /></button></Tooltip><Tooltip content="Redo"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted disabled:opacity-40" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 className="h-4 w-4" aria-hidden="true" /></button></Tooltip><Tooltip content="Duplicate selected node"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted disabled:opacity-40" onClick={duplicateSelected} disabled={!selectedNode} aria-label="Duplicate selected node"><Copy className="h-4 w-4" aria-hidden="true" /></button></Tooltip><span className="mx-1 h-5 w-px bg-line" aria-hidden="true" /><Tooltip content="Zoom in"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted" onClick={() => setZoom((value) => Math.min(2, value + 0.1))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" aria-hidden="true" /></button></Tooltip><Tooltip content="Zoom out"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted" onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" aria-hidden="true" /></button></Tooltip><Tooltip content="Reset view"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset zoom and pan"><Maximize2 className="h-4 w-4" aria-hidden="true" /></button></Tooltip><Tooltip content="Delete selected node"><button type="button" className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-control text-danger hover:bg-danger/10 disabled:opacity-40" onClick={removeSelected} disabled={!selectedNode} aria-label="Delete selected node"><X className="h-4 w-4" aria-hidden="true" /></button></Tooltip></div>

        <div className="diagram-canvas overflow-hidden rounded-panel border border-line-strong shadow-card"><svg viewBox={(() => { const bounds = getDiagramBounds(data); return `${bounds.x + pan.x} ${bounds.y + pan.y} ${bounds.width / zoom} ${bounds.height / zoom}`; })()} className="block min-h-[420px] w-full touch-none" role="application" aria-label="Diagram canvas" aria-describedby="diagram-canvas-help" tabIndex={0} onPointerDown={canvasDown} onPointerMove={pointerMove} onPointerUp={stopPointer} onPointerLeave={stopPointer}>{data.edges.map((edge) => { const source = data.nodes.find((node) => node.id === edge.source); const target = data.nodes.find((node) => node.id === edge.target); if (!source || !target) return null; const a = center(source); const b = center(target); return <g key={edge.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(var(--color-diagram-stroke))" strokeWidth={edge.style?.strokeWidth ?? 2} markerEnd="url(#arrow)" strokeDasharray={edge.style?.dashed ? "6 4" : undefined} /></g>; })}<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="rgb(var(--color-diagram-stroke))" /></marker></defs>{data.nodes.map((node) => <g key={node.id} onPointerDown={(event) => pointerDown(event, node)} onClick={() => clickNode(node.id)} className="cursor-move"><title>{node.label || "Untitled node"}</title>{node.shape === "circle" || node.shape === "ellipse" ? <ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} fill={node.style?.fill ?? "rgb(var(--color-diagram-node))"} stroke={node.style?.stroke ?? "rgb(var(--color-diagram-stroke))"} strokeWidth={node.style?.strokeWidth ?? 2} /> : <path d={nodePath(node)} fill={node.style?.fill ?? "rgb(var(--color-diagram-node))"} stroke={node.style?.stroke ?? "rgb(var(--color-diagram-stroke))"} strokeWidth={node.style?.strokeWidth ?? 2} />}{<text x={node.x + node.width / 2} y={node.y + node.height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={node.style?.fontSize ?? 14} fill="rgb(var(--color-diagram-text))" pointerEvents="none">{node.label}</text>}{selectedNode === node.id && <><rect x={node.x - 5} y={node.y - 5} width={node.width + 10} height={node.height + 10} fill="none" stroke="rgb(var(--color-diagram-selection))" strokeDasharray="4 3" /><rect x={node.x + node.width - 6} y={node.y + node.height - 6} width="12" height="12" rx="2" fill="rgb(var(--color-diagram-selection))" stroke="rgb(var(--color-surface))" onPointerDown={(event) => resizeStart(event, node)} className="cursor-se-resize" /></>}</g>)}</svg></div>
        {selected && <div className="mt-3 rounded-panel border border-line bg-surface p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint" htmlFor="node-label">Selected node</label><input id="node-label" value={selected.label ?? ""} onChange={(event) => updateNode(selected.id, { label: event.target.value })} className="h-10 w-full rounded-control border border-line-strong bg-paper px-3 text-sm text-ink" /></div><button type="button" onClick={() => setConnectFrom(selected.id)} aria-pressed={connectFrom === selected.id} className={`min-h-10 rounded-control px-3 py-2 text-sm font-medium ${connectFrom === selected.id ? "bg-action text-action-foreground" : "bg-ink/5 text-ink hover:bg-ink/10"}`}>{connectFrom === selected.id ? "Select target…" : "Connect from here"}</button></div></div>}
        <p id="diagram-canvas-help" className="mt-2 text-xs leading-relaxed text-ink-faint">Drag nodes to arrange them. Select a node, then connect it to another node from the inspector below the canvas.</p>
      </section>
    </div>
  );
}
