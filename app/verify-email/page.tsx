"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="min-h-screen bg-paper" />}><VerifyEmail /></Suspense>;
}

function VerifyEmail() {
  const params = useSearchParams();
  const email = params.get("email")?.trim() ?? "";
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "success" | "error">(email ? "idle" : "error");
  const [message, setMessage] = useState(email ? `We sent a six-digit code to ${email}.` : "Open the verification page from registration so we know which email to verify.");
  const [resending, setResending] = useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!email || !/^\d{6}$/.test(code)) {
      setStatus("error");
      setMessage("Enter the complete six-digit code.");
      return;
    }

    setStatus("working");
    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    if (!response?.ok) {
      setStatus("error");
      setMessage(data?.error ?? "We couldn't verify the code. Try again.");
      return;
    }
    setStatus("success");
    setMessage("Your email is verified. You can now sign in.");
  }

  async function resend() {
    if (!email) return;
    setResending(true);
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) : null;
    setResending(false);
    setStatus(response?.ok ? "idle" : "error");
    setMessage(response?.ok ? `A new six-digit code was sent to ${email}.` : data?.error ?? "We couldn't send another code.");
  }

  return <AuthFrame title="Check your inbox." description="One small step to make this space yours.">
          <p role="status" className={`mt-2 text-sm ${status === "error" ? "text-danger" : status === "success" ? "text-success" : "text-ink-soft"}`}>{message}</p>

          {status !== "success" && email && (
            <form onSubmit={verify} className="mt-6">
              <Label htmlFor="verification-code">Verification code</Label>
              <Input
                id="verification-code"
                name="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 text-center font-mono text-xl tracking-[0.45em]"
                autoFocus
                required
              />
              <Button type="submit" className="mt-4 w-full" loading={status === "working"}>Verify email</Button>
            </form>
          )}

          {status === "success" ? (
            <Link href="/login" className="mt-5 inline-flex text-sm font-medium text-ink underline">Continue to sign in</Link>
          ) : email ? (
            <button type="button" onClick={() => void resend()} disabled={resending} className="mt-4 text-sm text-ink-soft hover:text-ink hover:underline disabled:opacity-50">
              {resending ? "Sending…" : "Didn't receive it? Send a new code"}
            </button>
          ) : (
            <Link href="/register" className="mt-5 inline-flex text-sm font-medium text-ink underline">Return to sign up</Link>
          )}

  </AuthFrame>;
}
