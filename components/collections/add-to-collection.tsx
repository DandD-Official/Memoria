"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { readSubjects } from "@/lib/books/notebooks";

type Destination = { id: string; title: string; kind: "BOOK" | "NOTEBOOK"; subjects?: unknown };
export function AddToCollection({ resourceId, resourceType }: { resourceId: string; resourceType: "NOTE" | "REVIEWER" }) {
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState<Destination[]>([]);
  const [selected, setSelected] = useState(""), [subject, setSubject] = useState("");
  const [error, setError] = useState(""), [added, setAdded] = useState<Destination | null>(null);
  const [retry, setRetry] = useState(0);
  const destination = collections.find(item => item.id === selected);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError(""); setAdded(null);
    void fetch("/api/collections", { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load books and notebooks.");
      if (!controller.signal.aborted) { setCollections(data.collections); setSelected(data.collections[0]?.id ?? ""); setSubject(""); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load collections."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, retry]);
  async function add() {
    if (!destination) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/collections/" + destination.id + "/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceId, resourceType, subjectId: subject || null }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not add this memory.");
      setAdded(destination);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this memory."); }
    finally { setSaving(false); }
  }
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><BookPlus className="h-4 w-4" />Add to book or notebook</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }} title="Add to book or notebook" description="Keep this memory together with related material." footer={<Button onClick={() => void add()} loading={saving} disabled={loading || !destination || !!added}>Add memory</Button>}>
      {loading ? <p role="status">Loading books and notebooks?</p> : added ? <p role="status">Memory added to <Link className="underline" href={(added.kind === "NOTEBOOK" ? "/notebooks/" : "/books/") + added.id}>{added.title}</Link>.</p> : collections.length ? <div className="space-y-4">
        <label className="block text-sm font-medium">Book or notebook<select className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3" disabled={saving} value={selected} onChange={event => { setSelected(event.target.value); setSubject(""); }} >{collections.map(item => <option key={item.id} value={item.id}>{item.title} ({item.kind === "NOTEBOOK" ? "Notebook" : "Book"})</option>)}</select></label>
        {destination?.kind === "NOTEBOOK" && <label className="block text-sm font-medium">Notebook group<select className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3" disabled={saving} value={subject} onChange={event => setSubject(event.target.value)}><option value="">Unfiled</option>{readSubjects(destination.subjects).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      </div> : !error && <p>Create a <Link className="underline" href="/books">book</Link> or <Link className="underline" href="/notebooks">notebook</Link> first, then add this memory.</p>}
      {error && <div role="alert" className="mt-3 text-sm text-danger"><p>{error}</p><Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Reload collections</Button></div>}
    </Dialog>
  </>;
}
