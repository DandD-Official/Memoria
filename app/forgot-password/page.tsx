"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't request a reset link.");
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return <AuthFrame title="Reset your password" description="We'll email a secure, one-time reset link.">
    {sent ? <p className="text-sm text-success">If an account exists for that email, a reset link is on its way.</p> : <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="email">Email</Label><Input id="email" name="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button className="w-full" type="submit" loading={loading}>Send reset link</Button></form>}
    <Link href="/login" className="mt-5 block text-center text-sm text-ink-soft hover:underline">Back to sign in</Link>
  </AuthFrame>;
}
