"use client";

import { useEffect, useState } from "react";
import { offlineCommand, type OfflineStatus } from "@/lib/offline/client";
import { isLocalSession } from "@/lib/offline/local-session";

export function useConnection() {
  const [connection, setConnection] = useState({ online: true, localSession: false });
  useEffect(() => {
    const update = () => setConnection({ online: navigator.onLine, localSession: isLocalSession() });
    update();
    for (const event of ["online", "offline", "memoria:connection"]) window.addEventListener(event, update);
    return () => { for (const event of ["online", "offline", "memoria:connection"]) window.removeEventListener(event, update); };
  }, []);
  return connection;
}

export function useOfflineStatus() {
  const connection = useConnection();
  const [status, setStatus] = useState<OfflineStatus>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let active = true;
    const refresh = () => { void offlineCommand<OfflineStatus>("STATUS").then(value => { if (active) { setStatus(value); setError(""); } }).catch(caught => { if (active) setError(caught.message); }); };
    const receive = ({ data }: MessageEvent) => { if (data.type === "OFFLINE_STATUS") { setStatus(data.status); setError(""); } };
    navigator.serviceWorker.addEventListener("message", receive);
    window.addEventListener("memoria:offline-refresh", refresh);
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); navigator.serviceWorker.removeEventListener("message", receive); window.removeEventListener("memoria:offline-refresh", refresh); };
  }, []);
  return { ...connection, status, error };
}

export function refreshOfflineStatus() { window.dispatchEvent(new Event("memoria:offline-refresh")); }
