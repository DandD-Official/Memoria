"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { offlineCommand } from "@/lib/offline/client";
import { refreshOfflineStatus, useOfflineStatus } from "@/components/offline/use-offline-status";
import { OfflineStatusDetails } from "@/components/offline/offline-status";

export function OfflineSettings() {
  const { status, online, error: statusError } = useOfflineStatus();
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = refreshOfflineStatus;
  const preparation = status?.preparation;
  const preparing = busy || preparation?.state === "preparing";

  async function enable() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!status?.configured && (passphrase.length < 12 || passphrase !== confirmation)) throw new Error("Use at least 12 characters and enter the same passphrase twice.");
      await offlineCommand(status?.configured ? "UNLOCK" : "ENROLL", { passphrase });
      setPassphrase(""); setConfirmation("");
      let persistent = false;
      try { persistent = await navigator.storage?.persist?.() ?? false; } catch { /* Browser storage permission is best effort. */ }
      await offlineCommand("PREPARE");
      await refresh();
      setMessage(`Offline storage is unlocked. Preparation is running; keep Memoria open and follow its progress below.${persistent ? "" : " Your browser may remove local data if storage runs low."}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not prepare offline storage."); }
    finally { setBusy(false); refresh(); }
  }

  return <section id="offline" className="card mt-5 scroll-mt-24 p-5">
    <h2 className="font-display text-lg text-ink">Offline access</h2>
    <p className="mt-1 text-sm text-ink-soft">Save pages on this device using the same Memoria interface. A separate passphrase encrypts your local data. Set this up online on each device; your account password is never saved.</p>
    {status?.unlocked ? <div className="mt-4 space-y-4">
      <OfflineStatusDetails status={status} online={online} />
      <p className="text-sm text-ink-soft">Preparation saves Practice, Together, library pages, and accessible documents. Notes and reviewers save edits automatically on this device. Creating quizzes, submitting practice results, changing sharing, and live collaboration need a connection.</p>
      <Button variant="secondary" loading={preparing} disabled={!online} onClick={async () => {
        setBusy(true); setError(""); setMessage("");
        try { await offlineCommand("PREPARE"); refresh(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start preparation."); }
        finally { setBusy(false); }
      }}>{preparation?.failed.length ? "Retry offline preparation" : "Prepare offline library"}</Button>
      {preparation && preparation.state !== "idle" && <div className="space-y-2" aria-busy={preparation.state === "preparing"}>
        <p role="status" className="text-sm text-ink-soft">{preparation.state === "preparing" ? "Saving your library..." : preparation.state === "complete" ? "Offline library ready" : "Preparation needs attention"}: {preparation.completed} of {preparation.total} items saved</p>
        <progress aria-label="Offline preparation" value={preparation.completed} max={preparation.total || 1} className="h-2 w-full accent-action" />
        {preparation.current && preparation.state === "preparing" && <p className="break-all text-xs text-ink-faint">Saving {preparation.current}</p>}
        {preparation.failed.length > 0 && <details className="text-sm text-danger"><summary className="cursor-pointer">{preparation.failed.length} items could not be saved</summary><ul className="mt-2 space-y-1">{preparation.failed.map((failure, index) => <li key={index} className="break-words">{failure.path}: {failure.error}</li>)}</ul></details>}
      </div>}
      <p className="text-xs text-ink-faint">{status.lastPreparedAt ? "Last complete download: " + new Date(status.lastPreparedAt).toLocaleString() : "Your library has not finished downloading yet."}</p>
    </div> : <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void enable(); }}>
      <div><Label htmlFor="offline-passphrase">Offline passphrase</Label><PasswordInput id="offline-passphrase" autoComplete={status?.configured ? "current-password" : "new-password"} value={passphrase} onChange={event => setPassphrase(event.target.value)} required minLength={12} /></div>
      {!status?.configured && <div><Label htmlFor="offline-confirm">Confirm offline passphrase</Label><PasswordInput id="offline-confirm" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={12} /></div>}
      <p className="text-xs text-ink-soft">Keep this passphrase safe. It cannot be recovered. Signing out locks local data; removing it deletes any unsynced edits.</p>
      <Button type="submit" loading={busy} disabled={!status}>{status?.configured ? "Unlock offline access" : "Enable offline access"}</Button>
    </form>}
    {status?.configured && <div className="mt-4"><ConfirmDialog trigger={<Button variant="ghost">Remove offline data</Button>} title="Remove this device's offline data?" description="This permanently deletes saved pages and unsynced edits from this browser. Data already synced to your account stays there." confirmLabel="Remove local data" destructive onConfirm={async () => { await offlineCommand("REMOVE"); await refresh(); setMessage("Offline data removed from this device."); }} /></div>}
    {message && (!preparation || preparation.state === "idle" || preparation.state === "preparing") && <p role="status" className="mt-3 text-sm text-success">{message}</p>}
    {(error || statusError) && <p role="alert" className="mt-3 text-sm text-danger">{error || statusError}</p>}
    {process.env.NODE_ENV !== "production" && <p className="mt-3 text-sm text-ink-soft">Offline access is available in the production build. Run npm run build, then npm start to test it.</p>}
  </section>;
}
