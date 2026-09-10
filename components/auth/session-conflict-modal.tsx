"use client";

import { useEffect, useState } from "react";
import { LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionConflictModal({ userName, sessionId, otherDevice, currentDevice }: { userName: string; sessionId: string; otherDevice?: string; currentDevice?: string }) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<"logout_other" | "continue" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (window.sessionStorage.getItem("memoria-session-resolved") === sessionId) setOpen(false); }, [sessionId]);
  if (!open) return null;
  async function resolve(action: "logout_other" | "continue") {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/sessions/resolve", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "We could not update your session. Please try again.");
        return;
      }
      window.sessionStorage.setItem("memoria-session-resolved", sessionId);
      setOpen(false);
    } catch {
      setError("We could not reach the session service. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/25 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="session-conflict-title"><div className="card w-full max-w-md p-6 text-center shadow-card-hover"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-dark"><UserCheck className="h-5 w-5" /></span><h2 id="session-conflict-title" className="mt-4 font-display text-xl text-ink">{userName} is currently logged in.</h2><p className="mt-2 text-sm text-ink-soft">Memoria detected another recent session using <strong className="font-medium text-ink">{otherDevice ?? "another device"}</strong>. You are signing in with <strong className="font-medium text-ink">{currentDevice ?? "this device"}</strong>.</p><p className="mt-2 text-xs text-ink-faint">If both descriptions match, this may be a recently closed browser tab.</p>{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 grid gap-2"><Button onClick={() => void resolve("logout_other")} loading={busy === "logout_other"} disabled={busy !== null}><LogOut className="h-4 w-4" /> Log out the other session</Button><Button variant="outline" onClick={() => void resolve("continue")} loading={busy === "continue"} disabled={busy !== null}>Continue as {userName}</Button></div></div></div>;
}
