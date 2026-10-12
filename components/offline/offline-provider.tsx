"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { forgetOfflineKey, offlineCommand, offlineWorker } from "@/lib/offline/client";
import { toast } from "@/components/ui/toast";

export function OfflineProvider() {
  const pathname = usePathname();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void offlineWorker().catch(() => undefined);
    void offlineCommand("STATUS").catch(() => undefined);
    const sync = () => {
      if (navigator.onLine && document.visibilityState === "visible") void offlineCommand("SYNC").catch(() => undefined);
    };
    const message = ({ data }: MessageEvent) => {
      if (data.type === "OFFLINE_NOTICE") toast(data.message, data.error ? "error" : "success");
      if (data.type === "OFFLINE_DOCUMENT") window.dispatchEvent(new CustomEvent("memoria:offline-document", { detail: data.document }));
      if (data.type === "OFFLINE_LOCKED") { forgetOfflineKey(); window.location.replace("/login?offline=1"); }
    };
    navigator.serviceWorker.addEventListener("message", message);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    const interval = window.setInterval(sync, 30_000);
    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener("message", message);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    // Capture a full document as well as Next's route responses. This makes
    // refresh/direct navigation work without inventing another offline page.
    if (navigator.onLine) void offlineCommand("CAPTURE", { path: pathname + window.location.search }).catch(() => undefined);
  }, [pathname]);
  return null;
}
