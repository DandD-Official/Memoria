"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, FileText, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "@/components/ui/toast";

interface WorkspaceSummary { id: string; title: string; ownerId: string; expiresAt: string; _count: { notes: number; members: number } }
export function WorkspaceList() {
  const router = useRouter();
  const [items, setItems] = useState<WorkspaceSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void fetch("/api/workspaces", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.workspaces);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message || "Could not load workspaces. Try again."); });
    return () => controller.abort();
  }, [retry]);
  return <div className="space-y-8">
    <header className="page-header"><p className="eyebrow">Make something together</p><h1 className="page-heading mt-3 font-display">Workspaces</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">A shared desk for drafts, diagrams, and ideas. Keep multiple notes together, invite collaborators, and use the SVG helper to explain something visually.</p><Link href="/walkthrough/workspaces" className="journal-link mt-3">See how workspaces work</Link></header>
    <div className="flex gap-3 rounded-card border border-line bg-accent-soft p-5"><Clock3 className="mt-1 h-5 w-5 shrink-0" /><p className="text-sm leading-relaxed"><strong>Each workspace lasts three days from creation.</strong> Editing does not extend it. Export the notes you want to keep before the deadline. Up to five active workspaces and 20 notes per workspace.</p></div>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        toast("Workspace created. It is available for three days."); router.push(`/workspaces/${data.id}`);
      } catch (error) { setError(error instanceof Error ? error.message : "Could not create workspace. Try again."); setBusy(false); }
    }} className="rounded-card border border-line bg-surface p-5"><Label htmlFor="workspace-title">What are you working on?</Label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><Input id="workspace-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={150} placeholder="For example, Biology study group" /><Button type="submit" loading={busy} disabled={!title.trim()} className="shrink-0"><Plus className="h-4 w-4" />Create workspace</Button></div></form>
    {error && <div role="alert" className="text-sm text-danger">{error} <button onClick={() => setRetry(value => value + 1)} className="underline">Retry loading</button></div>}
    {!items && !error ? <LoadingState rows={3} label="Loading your workspaces" /> : items?.length === 0 ? <div className="rounded-card border border-dashed border-line p-10 text-center"><FileText className="mx-auto h-8 w-8 text-ink-soft" /><h2 className="mt-4 font-display text-2xl">Room for your next idea</h2><p className="mt-2 text-sm text-ink-soft">Create a workspace above. Workspaces shared with you will also appear here.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items?.map(item => <Link key={item.id} href={`/workspaces/${item.id}`} className="interactive-card block rounded-card border border-line bg-surface p-6"><FileText className="h-5 w-5 text-action" /><h2 className="mt-4 break-words font-display text-xl">{item.title}</h2><p className="mt-3 flex items-center gap-2 text-xs text-ink-soft"><Users className="h-4 w-4" />{item._count.notes} notes · {item._count.members + 1} people</p><p className="mt-3 text-xs text-ink-soft">Expires {new Date(item.expiresAt).toLocaleString()}</p></Link>)}</div>}
  </div>;
}
