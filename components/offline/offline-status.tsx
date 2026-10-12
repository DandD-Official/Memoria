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
  const { status, online, localSession } = useOfflineStatus();
  if (!status?.unlocked) return null;
  return <aside aria-label="Offline saving and sync" className="border-b border-line bg-surface-muted">
    <div className="mx-auto max-w-[1400px] space-y-2 px-page py-3">
      <OfflineStatusDetails status={status} online={online} />
      {localSession && online && <p className="text-xs text-ink-soft">Connection restored. Saved edits sync automatically when your online session is valid.</p>}
      <Link href="/settings#offline" className="inline-flex min-h-8 items-center text-xs text-accent-dark underline">Offline library and download progress</Link>
    </div>
  </aside>;
}
