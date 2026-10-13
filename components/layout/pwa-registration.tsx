"use client";

import { useEffect } from "react";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window { memoriaInstallPrompt: InstallPromptEvent | null }
}

export function PwaRegistration() {
  useEffect(() => {
    // OfflineProvider owns the root service worker. Keep installation events
    // here without replacing the encrypted worker with the legacy worker.
    const installAvailable = (event: Event) => {
      event.preventDefault();
      window.memoriaInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event("memoria:install-available"));
    };
    const installed = () => { window.memoriaInstallPrompt = null; };
    window.addEventListener("beforeinstallprompt", installAvailable);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", installAvailable); window.removeEventListener("appinstalled", installed); };
  }, []);
  return null;
}
