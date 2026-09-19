"use client";

import { useState } from "react";
import { History, RotateCcw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet } from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";

type ResourceType = "NOTE" | "REVIEWER";

interface RevisionSnapshot {
  title?: string;
  description?: string | null;
  content?: string;
}

interface Revision {
  id: string;
  createdAt: string;
  snapshot: RevisionSnapshot;
}

export function RevisionHistory({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    setOpen(true);
    if (revisions) return;
    setError(null);
    try {
      const response = await fetch(`/api/revisions?resourceType=${resourceType}&resourceId=${resourceId}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not load version history.");
      const next = (data?.revisions ?? []) as Revision[];
      setRevisions(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load version history.");
    }
  }

  async function restore(revisionId: string) {
    setBusy(revisionId);
    setError(null);
    try {
      const response = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not restore this version.");
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restore this version.");
      throw caught;
    } finally {
      setBusy(null);
    }
  }

  const selected = revisions?.find((revision) => revision.id === selectedId) ?? null;
  const resourceLabel = resourceType === "NOTE" ? "Note" : "Reviewer";

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => void loadHistory()} aria-haspopup="dialog">
        <History className="h-3.5 w-3.5" aria-hidden="true" /> History
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={`${resourceLabel} history`}
        description="Review an earlier snapshot before replacing the current version."
        className="sm:max-w-xl"
      >
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-control border border-danger/25 bg-danger/5 p-3 text-sm text-danger" role="alert">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {revisions === null && !error ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-ink-faint" role="status">Loading version history…</div>
        ) : revisions?.length === 0 ? (
          <div className="rounded-card border border-dashed border-line p-6 text-center">
            <History className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
            <p className="mt-3 font-medium text-ink">No earlier versions yet</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">Saved changes will appear here so you can safely revisit them.</p>
          </div>
        ) : revisions ? (
          <div className="grid gap-5 sm:grid-cols-[minmax(11rem,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="eyebrow text-ink-faint">Snapshots</p>
              <div className="mt-2 space-y-1" role="listbox" aria-label="Available versions">
                {revisions.map((revision, index) => {
                  const active = revision.id === selectedId;
                  return (
                    <button
                      key={revision.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(revision.id)}
                      className={`relative w-full rounded-control border px-3 py-2.5 text-left transition-colors ${active ? "border-accent bg-accent-soft/50 text-ink" : "border-transparent text-ink-soft hover:border-line hover:bg-surface-muted"}`}
                    >
                      <span className="block text-xs font-semibold">{index === 0 ? "Most recent snapshot" : `Earlier snapshot ${index + 1}`}</span>
                      <span className="mt-0.5 block text-[0.6875rem] text-ink-faint">{formatDate(revision.createdAt)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <div className="min-w-0 rounded-card border border-line bg-surface-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow text-ink-faint">Preview</p>
                    <h3 className="mt-1 truncate font-display text-xl text-ink">{selected.snapshot.title || "Untitled"}</h3>
                    <p className="mt-1 text-xs text-ink-faint">Saved {formatDate(selected.createdAt)}</p>
                  </div>
                  <RotateCcw className="h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />
                </div>
                {selected.snapshot.description && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{selected.snapshot.description}</p>}
                <div className="mt-4 max-h-56 overflow-y-auto rounded-control border border-line bg-surface p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">{selected.snapshot.content || "No content in this snapshot."}</p>
                </div>
                <ConfirmDialog
                  trigger={<Button className="mt-4 w-full" size="sm" loading={busy === selected.id}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore this version</Button>}
                  title="Restore this version?"
                  description="Your current version will be saved to history first. You can return to it later."
                  confirmLabel="Restore version"
                  onConfirm={() => restore(selected.id)}
                />
              </div>
            )}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
