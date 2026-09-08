"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function CollectionPasswordGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter(); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function unlock(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(null); const response = await fetch(`/api/collections/public/${slug}/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await response.json().catch(() => null); setLoading(false); if (!response.ok) { setError(data?.error ?? "Couldn't unlock this Book."); return; } router.refresh(); }
  return <main className="flex min-h-screen items-center justify-center bg-paper px-6"><form onSubmit={unlock} className="card w-full max-w-sm p-7"><Lock className="h-6 w-6 text-accent-dark" /><h1 className="mt-3 font-display text-xl text-ink">{title}</h1><p className="mt-1 text-sm text-ink-soft">This Book is password protected.</p><div className="mt-5"><Label htmlFor="collection-password">Password</Label><Input id="collection-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></div>{error && <p className="mt-2 text-sm text-danger">{error}</p>}<Button className="mt-4 w-full" loading={loading}>Open Book</Button></form></main>;
}
