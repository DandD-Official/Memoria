"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { offlineCommand, type OfflineStatus } from "@/lib/offline/client";

export function OfflineSettings() {
  const [status, setStatus] = useState<OfflineStatus>();
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = () => offlineCommand<OfflineStatus>("STATUS").then(setStatus);
  useEffect(() => { void refresh().catch(caught => setError(String(caught.message))); }, []);

  async function enable() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!status?.configured && (passphrase.length < 12 || passphrase !== confirmation)) throw new Error("Use at least 12 characters and enter the same passphrase twice.");
      await offlineCommand(status?.configured ? "UNLOCK" : "ENROLL", { passphrase });
      setPassphrase(""); setConfirmation("");
      let persistent = false;
      try { persistent = await navigator.storage?.persist?.() ?? false; } catch { /* Browser storage permission is best effort. */ }
      await offlineCommand("CAPTURE", { path: "/dashboard" });
      await offlineCommand("PREPARE");
      await refresh();
      setMessage(`Offline storage is unlocked. Your notes and reviewers are downloading in the background; keep Memoria open until preparation finishes. Other pages save when opened. Edits sync when connected.${persistent ? "" : " Your browser may remove local data if storage runs low."}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not prepare offline storage."); }
    finally { setBusy(false); void refresh().catch(() => undefined); }
  }

  return <section id="offline" className="card mt-5 scroll-mt-24 p-5">
    <h2 className="font-display text-lg text-ink">Offline access</h2>
    <p className="mt-1 text-sm text-ink-soft">Save pages on this device using the same Memoria interface. A separate passphrase encrypts your local data. Set this up online on each device; your account password is never saved.</p>
    {status?.unlocked ? <div className="mt-4 space-y-3"><p role="status" className="text-sm text-ink-soft">Unlocked · {status.pending} changes waiting to sync{status.conflicts ? ` · ${status.conflicts} need review` : ""}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { try { setError(""); await offlineCommand("SYNC"); await refresh(); } catch (caught) { setError(String(caught)); } }}>Sync now</Button><Button variant="ghost" onClick={async () => { try { await offlineCommand("PREPARE"); setMessage("Preparing your library. Keep Memoria open until preparation finishes."); } catch (caught) { setError(String(caught)); } }}>Prepare offline library</Button></div></div> : <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void enable(); }}>
      <div><Label htmlFor="offline-passphrase">Offline passphrase</Label><PasswordInput id="offline-passphrase" autoComplete={status?.configured ? "current-password" : "new-password"} value={passphrase} onChange={event => setPassphrase(event.target.value)} required minLength={12} /></div>
      {!status?.configured && <div><Label htmlFor="offline-confirm">Confirm offline passphrase</Label><PasswordInput id="offline-confirm" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={12} /></div>}
      <p className="text-xs text-ink-soft">Keep this passphrase safe. It cannot be recovered. Signing out locks local data; removing it deletes any unsynced edits.</p>
      <Button type="submit" loading={busy} disabled={!status}>{status?.configured ? "Unlock offline access" : "Enable offline access"}</Button>
    </form>}
    {status?.configured && <div className="mt-4"><ConfirmDialog trigger={<Button variant="ghost">Remove offline data</Button>} title="Remove this device's offline data?" description="This permanently deletes saved pages and unsynced edits from this browser. Data already synced to your account stays there." confirmLabel="Remove local data" destructive onConfirm={async () => { await offlineCommand("REMOVE"); await refresh(); setMessage("Offline data removed from this device."); }} /></div>}
    {message && <p role="status" className="mt-3 text-sm text-success">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </section>;
}
