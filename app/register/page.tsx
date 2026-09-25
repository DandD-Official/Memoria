"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { registerSchema } from "@/lib/validation/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invitedEmail = new URLSearchParams(window.location.search).get("email");
    if (invitedEmail) setForm((current) => ({ ...current, email: invitedEmail }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      if (data.requiresVerification) {
        router.replace(`/verify-email?sent=1&email=${encodeURIComponent(parsed.data.email)}`);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.replace("/login");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
      setLoading(false);
    }
  }

  return <AuthFrame title="A fresh page." description="Create an account to keep your material and build a practice that lasts.">
          <form onSubmit={handleSubmit} autoComplete="on" className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
            {error && <p className="rounded-control border border-danger/25 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
            <p className="text-xs leading-relaxed text-ink-soft">By creating an account, you agree to the <Link href="/terms-of-service" className="text-ink underline underline-offset-2">Terms of Service</Link>. Read our <Link href="/privacy-policy" className="text-ink underline underline-offset-2">Privacy Policy</Link> to learn how your information is handled.</p>
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink hover:underline">
              Sign in
            </Link>
          </p>
  </AuthFrame>;
}
