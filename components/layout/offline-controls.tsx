"use client";

import { useEffect, useRef, useState } from "react";
import { Download, HardDriveDownload, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstallPromptEvent } from "@/components/layout/pwa-registration";
import { removeOfflineSnapshot, readOfflineSnapshot, saveOfflineSnapshot, setActiveOfflineAccount, type OfflineSnapshot } from "@/lib/offline-store";

export function OfflineSync({ accountId }: { accountId: string }) {
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const sync = async () => {
      if (!navigator.onLine || document.visibilityState === "hidden" || inFlight.current) return;
      inFlight.current = true;
      window.dispatchEvent(new CustomEvent("memoria:offline-sync-state", { detail: { syncing: true } }));
      try {
        const response = await fetch("/api/offline/snapshot", { cache: "no-store", credentials: "include", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to refresh this device's offline copy." : "Could not update the offline copy.");
        const snapshot = await response.json() as OfflineSnapshot;
        if (snapshot.account.id !== accountId) throw new Error("The account changed. Reload to sync its offline copy.");
        if (!active) return;
        await saveOfflineSnapshot(snapshot);
        if (active) window.dispatchEvent(new CustomEvent("memoria:offline-synced", { detail: snapshot.syncedAt }));
        if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
      } catch (cause) {
        const cached = await readOfflineSnapshot(accountId).catch(() => null);
        if (active && navigator.onLine && !(cause instanceof DOMException && cause.name === "AbortError")) window.dispatchEvent(new CustomEvent("memoria:offline-sync-error", { detail: { error: cause instanceof Error ? cause.message : "Could not update the offline copy.", syncedAt: cached?.syncedAt ?? null } }));
      } finally {
        inFlight.current = false;
        if (active) window.dispatchEvent(new CustomEvent("memoria:offline-sync-state", { detail: { syncing: false } }));
      }
    };
    setActiveOfflineAccount(accountId);
    void readOfflineSnapshot(accountId).then(snapshot => { if (active && snapshot) window.dispatchEvent(new CustomEvent("memoria:offline-synced", { detail: snapshot.syncedAt })); }).catch(() => {});
    void sync();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 5 * 60_000);
    const backOnline = () => void sync();
    window.addEventListener("online", backOnline);
    window.addEventListener("focus", backOnline);
    document.addEventListener("visibilitychange", backOnline);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("online", backOnline);
      window.removeEventListener("focus", backOnline);
      document.removeEventListener("visibilitychange", backOnline);
    };
  }, [accountId]);
  return null;
}

export function OfflineControls({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [online, setOnline] = useState(true);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const installAvailable = () => setInstallPrompt(window.memoriaInstallPrompt ?? null);
    const installDone = () => { setStandalone(true); setInstallPrompt(null); };
    const syncState = (event: Event) => setSyncing(Boolean((event as CustomEvent<{ syncing: boolean }>).detail?.syncing));
    const syncError = (event: Event) => { const detail = (event as CustomEvent<{ error: string; syncedAt: string | null }>).detail; setError(detail.error); setSyncedAt(detail.syncedAt); };
    const synced = (event: Event) => { setSyncedAt((event as CustomEvent<string | null>).detail ?? null); setError(""); };
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    void readOfflineSnapshot(accountId).then(snapshot => { if (snapshot) setSyncedAt(snapshot.syncedAt); }).catch(() => {});
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("memoria:install-available", installAvailable);
    window.addEventListener("appinstalled", installDone);
    window.addEventListener("memoria:offline-sync-state", syncState);
    window.addEventListener("memoria:offline-sync-error", syncError);
    window.addEventListener("memoria:offline-synced", synced);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("memoria:install-available", installAvailable);
      window.removeEventListener("appinstalled", installDone);
      window.removeEventListener("memoria:offline-sync-state", syncState);
      window.removeEventListener("memoria:offline-sync-error", syncError);
      window.removeEventListener("memoria:offline-synced", synced);
    };
  }, [accountId]);

  async function install() {
    if (!installPrompt) { setIosHint(true); return; }
    setInstalling(true);
    try { await installPrompt?.prompt(); await installPrompt?.userChoice; setInstallPrompt(null); }
    finally { setInstalling(false); }
  }

  const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent) && !standalone;
  return <div className="space-y-4 py-5">
    <section className="rounded-control border border-line bg-surface-muted p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        {online ? <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-study" aria-hidden="true" /> : <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-book" aria-hidden="true" />}
        <div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{online ? syncing ? "Updating this device" : "Available offline" : "You are offline"}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{syncedAt ? `Last synced ${new Date(syncedAt).toLocaleString()}.` : "Your study files will be saved on this device after the first sync."}{!online && syncedAt && <span className="block">Your saved files are ready in the offline library.</span>}</p>
          {error && <p role="status" className="mt-2 text-xs text-danger">{error}</p>}
          {!online && <a href="/offline" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-accent-dark"><HardDriveDownload className="h-4 w-4" />Open offline files</a>}
        </div>
      </div>
    </section>
    {!standalone && (installPrompt || ios) && <section><p className="mb-2 text-sm font-medium">Install Memoria</p><p className="mb-3 text-xs leading-relaxed text-ink-soft">Keep your study space one tap away and open synced files without a connection.</p><Button type="button" variant="outline" loading={installing} onClick={() => void install()}><Download className="h-4 w-4" />{ios ? "Add to Home Screen" : "Install app"}</Button>{iosHint && ios && <p className="mt-3 text-xs leading-relaxed text-ink-soft">In Safari, tap Share, then “Add to Home Screen”.</p>}</section>}
    <div className="border-t border-line pt-4"><Button type="button" variant="ghost" size="sm" onClick={() => { void removeOfflineSnapshot(accountId).then(() => { setSyncedAt(null); window.dispatchEvent(new CustomEvent("memoria:offline-synced", { detail: null })); }).catch(() => setError("Could not remove the saved files from this device.")); }} disabled={!syncedAt}><Trash2 className="h-4 w-4" />Remove files from this device</Button><p className="mt-2 text-xs text-ink-faint">Offline copies stay on this device and are visible to anyone who can unlock it.</p><span className="sr-only">Offline account: {accountName}</span></div>
  </div>;
}
