"use client";

import { useEffect, useState } from "react";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface DiagramSummary { id: string; title: string; updatedAt: string }

export function MmdDiagramPicker({ onInsert, disabled }: { onInsert: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch("/api/diagrams", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error ?? "Could not load diagrams.");
        setDiagrams(result?.diagrams ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load diagrams."))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)} title="Append a saved diagram">
        <Network className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">Diagram</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Append a saved diagram" description="Choose a diagram to place at the current cursor position. The reference will stay connected to the editable diagram."
        footer={<Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>}
      >
        {loading && <p className="text-sm text-ink-soft">Loading your diagrams…</p>}
        {error && <p className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        {!loading && !error && diagrams.length === 0 && (
          <div className="rounded-card border border-dashed border-line p-5 text-center">
            <Network className="mx-auto h-6 w-6 text-accent-dark" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-ink">No saved diagrams yet</p>
            <p className="mt-1 text-xs text-ink-faint">Create one in the Diagrams workspace, then append it here.</p>
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
      </Dialog>
    </>
  );
}
