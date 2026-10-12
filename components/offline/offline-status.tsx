"use client";

import { useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "@/components/layout/navigation-link";
import { offlineCommand, type OfflineStatus } from "@/lib/offline/client";
import { refreshOfflineStatus, useOfflineStatus } from "@/components/offline/use-offline-status";

export function OfflineStatusDetails({ status, online }: { status: OfflineStatus; online: boolean }) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const sync = status.synchronization;
  const busy = requesting || sync?.state === "syncing";
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
        {online ? <Cloud className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
        {!online ? "Offline · changes save on this device" : busy ? `Syncing ${sync?.completed ?? 0} of ${sync?.total ?? status.pending} changes…` : status.pending ? `Online · ${status.pending} changes waiting to sync` : "Online · no local changes waiting"}
      </p>
      <Button size="sm" variant="secondary" loading={busy} disabled={!online || !status.unlocked} onClick={async () => {
        setRequesting(true); setError("");
        try { await offlineCommand("SYNC"); refreshOfflineStatus(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start syncing."); }
        finally { setRequesting(false); }
      }}><RefreshCw className="h-4 w-4" />Sync now</Button>
    </div>
    <p className="text-xs text-ink-faint">{status.pending} pending · {status.conflicts} need review · {status.lastSyncedAt ? `Last sync: ${new Date(status.lastSyncedAt).toLocaleString()}` : "No successful sync yet"}</p>
    {(error || (online && sync?.error)) && <p role="alert" className="text-sm text-danger">{error || sync?.error} <Link href="/login" className="underline">Sign in online</Link></p>}
    {status.conflicts > 0 && <p className="text-sm text-ink-soft">Open the affected document to review its saved draft before syncing.</p>}
  </div>;
}

export function OfflineStatusBar() {
  const { status, online } = useOfflineStatus();
  if (!status?.unlocked) return null;
  const sync = status.synchronization;
  return <aside aria-label="Offline saving and sync" className="border-b border-line bg-surface-muted">
    <div role="status" className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-page py-2 text-xs text-ink-soft">
      <span className="inline-flex items-center gap-2">{online ? <Cloud className="h-4 w-4" aria-hidden="true" /> : <CloudOff className="h-4 w-4" aria-hidden="true" />}{online ? "You're online" : "You're currently offline"}</span>
      <span>{status.pending} pending {status.pending === 1 ? "change" : "changes"}</span>
      <span>{!online ? "Saved on this device. Sync resumes when connected." : sync?.state === "syncing" ? `Updating files: ${sync.completed} of ${sync.total}` : status.conflicts ? `${status.conflicts} changes need review before syncing.` : sync?.error ? "Sync paused. Your local changes are kept." : status.pending ? "Waiting to update your online files." : "No changes waiting to sync."}</span>
    </div>
  </aside>;
}
