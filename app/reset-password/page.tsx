"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-paper" />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't reset your password.");
      setComplete(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't reach the server."); }
    finally { setLoading(false); }
  }
  return <AuthFrame title="Start with a new password." description="Choose at least eight characters to protect your learning space.">{complete ? <><p role="status" className="text-sm text-success">Your password has been updated.</p><Link href="/login" className="journal-link mt-4">Continue to sign in</Link></> : !token ? <div><p className="text-sm text-ink-soft">This page needs the reset link from your email. Request a new link to continue.</p><Link href="/forgot-password" className="journal-link mt-4">Request a reset link</Link></div> : <form onSubmit={submit} className="space-y-5"><div><Label htmlFor="password">New password</Label><Input id="password" name="password" autoComplete="new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p role="alert" className="text-sm text-danger">{error} Request a new reset link if this one has expired.</p>}<Button className="w-full" loading={loading}>Reset password</Button><Link href="/forgot-password" className="journal-link">Request a new link</Link></form>}</AuthFrame>;
}
