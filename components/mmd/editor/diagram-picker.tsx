"use client";

import { useEffect, useState } from "react";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import dynamic from "next/dynamic";

const DiagramEditor = dynamic(() => import("@/components/diagrams/diagram-editor").then(module => module.DiagramEditor), { ssr: false });

interface DiagramSummary { id: string; title: string; updatedAt: string }

export function MmdDiagramPicker({ onInsert, disabled }: { onInsert: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);

  function close(next: boolean) {
    if (!next && creating && dirty && !window.confirm("Discard this diagram's unsaved changes?")) return;
    setOpen(next); if (!next) { setCreating(false); setDirty(false); }
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    fetch("/api/diagrams", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? "Could not load diagrams.");
        if (!controller.signal.aborted) setDiagrams(result?.diagrams ?? []);
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load diagrams."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)} title="Append a saved diagram">
        <Network className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">Diagram</span>
      </Button>
      <Dialog open={open} onOpenChange={close} fullScreen={creating} title={creating ? "Create a diagram for this memory" : "Insert a diagram"} description="Insert at the current cursor position. Your memory stays connected to the editable diagram."
        footer={<Button type="button" variant="ghost" onClick={() => close(false)}>Close</Button>}
      >
        {creating ? <DiagramEditor initialDiagrams={[]} onDirtyChange={setDirty} onInsert={id => { onInsert(id); setOpen(false); setCreating(false); setDirty(false); }} /> : <>
        <Button type="button" variant="outline" className="mb-4 w-full" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create a diagram</Button>
        {loading && <p className="text-sm text-ink-soft">Loading your diagrams…</p>}
        {error && <p className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        {!loading && !error && diagrams.length === 0 && (
          <div className="rounded-card border border-dashed border-line p-5 text-center">
            <Network className="mx-auto h-6 w-6 text-accent-dark" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-ink">No saved diagrams yet</p>
            <p className="mt-1 text-xs text-ink-faint">Create a diagram here and insert it into your memory.</p>
          </div>
        )}
        <div className="space-y-2">
          {diagrams.map((diagram) => (
            <button key={diagram.id} type="button" className="flex w-full items-center gap-3 rounded-control border border-line p-3 text-left hover:border-accent hover:bg-accent-soft/30" onClick={() => { onInsert(diagram.id); setOpen(false); }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-dark"><Plus className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{diagram.title}</span><span className="block text-xs text-ink-faint">Updated {new Date(diagram.updatedAt).toLocaleDateString()}</span></span>
            </button>
          ))}
        </div>
        </>}
      </Dialog>
    </>
  );
}
