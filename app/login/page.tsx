"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginSchema } from "@/lib/validation/auth";

const REMEMBERED_EMAIL_KEY = "memoria-remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setForm((current) => ({ ...current, email: rememberedEmail }));
      setKeepLoggedIn(true);
    }

    // A returning user with a valid persistent session does not need to enter
    // credentials again, even if they reached the sign-in page directly.
    void getSession()
      .then((session) => {
        if (session?.user) router.replace("/dashboard");
      })
      .catch(() => {
        // A temporary session check failure should not block manual sign-in.
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      keepLoggedIn: keepLoggedIn ? "true" : "false",
      redirect: false,
    }).catch(() => ({ error: "ConnectionError" }));
    setLoading(false);

    if (result?.error) {
      setError(result.error === "ConnectionError" ? "Sign in could not connect. Check your connection and try again." : "That email and password don't match. Check your details or reset your password.");
      return;
    }

    if (keepLoggedIn) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, parsed.data.email.toLowerCase().trim());
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
    router.replace("/dashboard");
  }

  return <AuthFrame title="Welcome back." description="Pick up a thread. Your learning is right where you left it.">
          <form onSubmit={handleSubmit} autoComplete="on" className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
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
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    name="keepLoggedIn"
                    checked={keepLoggedIn}
                    onChange={(event) => setKeepLoggedIn(event.target.checked)}
                    className="h-4 w-4 rounded border-line accent-accent"
                  />
                  Keep me logged in
                </label>
                <Link href="/forgot-password" className="text-xs text-ink-soft hover:text-ink hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && <p className="rounded-control border border-danger/25 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            New to Memoria?{" "}
            <Link href="/register" className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </p>
  </AuthFrame>;
}
