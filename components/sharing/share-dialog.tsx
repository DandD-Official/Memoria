"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, Loader2, Search, Share2, Trash2, UserRound, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ShareRow {
  id: string;
  permission: "VIEW" | "EDIT";
  user: { id: string; name: string; email: string };
  pending?: boolean;
}

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export function ShareDialog({ resourceType, resourceId }: { resourceType: "NOTE" | "REVIEWER" | "QUIZ"; resourceId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      fetch(`/api/share?resourceType=${resourceType}&resourceId=${resourceId}`).then((response) => response.json()),
      resourceType === "NOTE"
        ? fetch(`/api/share/public?resourceType=${resourceType}&resourceId=${resourceId}`).then((response) => response.json())
        : Promise.resolve({ url: null }),
    ])
      .then(([shareData, publicData]) => {
        setShares(shareData.shares ?? []);
        setPublicUrl(publicData.url ?? null);
      })
      .catch(() => setError("We couldn't reach the server. Check your connection and try again."));
  }, [open, resourceType, resourceId]);

  useEffect(() => {
    if (!open || email.trim().length < 2 || selectedUser?.email === email) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(email.trim())}`, { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (response.ok) setSuggestions(data?.users ?? []);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [email, open, selectedUser]);

  async function createPublicLink() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/share/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) setError(data?.error ?? "Couldn't create a public link.");
      else setPublicUrl(data.url);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPublicLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Your browser blocked copying. Select and copy the link manually.");
    }
  }

  async function removePublicLink() {
    setLoading(true);
    const response = await fetch("/api/share/public", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId }) });
    setLoading(false);
    if (response.ok) setPublicUrl(null);
    else setError("Couldn't disable the public link.");
  }

  async function handleShare() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId, granteeEmail: selectedUser?.email, permission: "EDIT" }) });
      const data = await response.json().catch(() => null);
      if (!data) return setError("The server sent back something unexpected. Please try again.");
      if (!response.ok) return setError(data.error ?? "Couldn't share.");
      setEmail("");
      setSelectedUser(null);
      setSuggestions([]);
      setShares((previous) => [...previous.filter((share) => share.id !== data.share.id), data.share]);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(shareId: string, pending = false) {
    const response = await fetch("/api/share", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceType, resourceId, shareId, pending }) });
    if (response.ok) setShares((previous) => previous.filter((share) => share.id !== shareId));
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5">
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <div className="card max-h-[85vh] w-full max-w-md overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div><h3 className="font-display text-lg text-ink">Share</h3><p className="text-xs text-ink-soft">Choose view-only link access or invite an editor.</p></div>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-ink-faint" /></button>
            </div>

            {resourceType === "NOTE" && (
              <section className="rounded-lg border border-line bg-ink/[0.02] p-4">
                <div className="flex items-start gap-3"><Link2 className="mt-0.5 h-4 w-4 text-accent-dark" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">Anyone with the link</p><p className="mt-0.5 text-xs text-ink-soft">People can read this note without signing in. They cannot edit it.</p></div></div>
                {publicUrl ? (
                  <div className="mt-3">
                    <div className="flex gap-2"><Input readOnly value={publicUrl} aria-label="Public view link" /><Button size="sm" onClick={copyPublicLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}</Button></div>
                    <button onClick={removePublicLink} disabled={loading} className="mt-2 text-xs text-danger hover:underline">Disable public link</button>
                  </div>
                ) : <Button size="sm" className="mt-3 w-full" loading={loading} onClick={createPublicLink}>Create view-only link</Button>}
              </section>
            )}

            <section className="mt-5 border-t border-line pt-5">
              <Label htmlFor="editor-search">Invite a Memoria editor</Label>
              <p className="mb-2 text-xs text-ink-soft">Search existing users by name or email. Editors need a Memoria account.</p>
              <div className="relative"><Input id="editor-search" value={email} onChange={(event) => { setEmail(event.target.value); setSelectedUser(null); }} placeholder="Search name or email…" autoComplete="off" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</span></div>
              {email.trim().length >= 2 && !searching && (
                <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
                  {suggestions.length > 0 ? suggestions.map((user) => (
                    <button key={user.id} onClick={() => { setEmail(user.email); setSelectedUser(user); setSuggestions([]); }} className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-ink/5"><UserRound className="h-4 w-4 text-ink-faint" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{user.name}</span><span className="block truncate text-xs text-ink-faint">{user.email}</span></span></button>
                  )) : <p className="px-3 py-2 text-xs text-ink-faint">No matching Memoria users.</p>}
                </div>
              )}
              {selectedUser && <p className="mt-2 text-xs text-success">Selected {selectedUser.name}</p>}
              <Button size="sm" className="mt-3 w-full" onClick={handleShare} loading={loading} disabled={!selectedUser}>Give edit access</Button>
            </section>

            {error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
            {shares.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-line pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">People with access</p>
                {shares.map((share) => <div key={share.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate text-ink">{share.user.name || share.user.email}</p><p className="truncate text-xs text-ink-faint">{share.user.email}</p><Badge tone={share.permission === "EDIT" ? "accent" : "neutral"}>{share.pending ? "PENDING" : share.permission}</Badge></div><button onClick={() => handleRevoke(share.id, share.pending)} className="text-ink-faint hover:text-danger" aria-label={`Remove ${share.user.email}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4"><Link href="/books" className="flex min-h-10 items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><Layers className="h-3.5 w-3.5" /> Add this to a Book</Link></div>
          </div>
        </div>
      )}
    </>
  );
}
