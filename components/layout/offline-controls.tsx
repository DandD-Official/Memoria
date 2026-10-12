"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "@/components/layout/navigation-link";
import type { InstallPromptEvent } from "@/components/layout/pwa-registration";

// Keep installation support while the encrypted provider owns offline storage.
export function OfflineControls({ accountName }: { accountId: string; accountName: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const installAvailable = () => setInstallPrompt(window.memoriaInstallPrompt ?? null);
    const installDone = () => { setStandalone(true); setInstallPrompt(null); };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    installAvailable();
    window.addEventListener("memoria:install-available", installAvailable);
    window.addEventListener("appinstalled", installDone);
    return () => {
      window.removeEventListener("memoria:install-available", installAvailable);
      window.removeEventListener("appinstalled", installDone);
    };
  }, []);

  async function install() {
    if (!installPrompt) { setIosHint(true); return; }
    setInstalling(true);
    try { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }
    finally { setInstalling(false); }
  }

  return <div className="space-y-4 py-5">
    <Link href="/settings#offline" className="inline-flex min-h-11 items-center text-sm font-medium text-accent-dark">Manage encrypted offline access</Link>
    {!standalone && (installPrompt || ios) && <section>
      <p className="mb-2 text-sm font-medium">Install Memoria</p>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">Keep your study space one tap away.</p>
      <Button type="button" variant="outline" loading={installing} onClick={() => void install()}><Download className="h-4 w-4" />{ios ? "Add to Home Screen" : "Install app"}</Button>
      {iosHint && ios && <p className="mt-3 text-xs leading-relaxed text-ink-soft">In Safari, tap Share, then Add to Home Screen.</p>}
    </section>}
    <span className="sr-only">Offline account: {accountName}</span>
  </div>;
}
