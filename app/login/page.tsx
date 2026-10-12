"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/components/layout/navigation-loading";
import Link from "@/components/layout/navigation-link";
import { getSession, signIn } from "next-auth/react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginSchema } from "@/lib/validation/auth";
import { offlineCommand } from "@/lib/offline/client";

const REMEMBERED_EMAIL_KEY = "memoria-remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const offlineLogin = !navigator.onLine || new URLSearchParams(window.location.search).get("offline") === "1";
    setOffline(offlineLogin);
    if (new URLSearchParams(window.location.search).has("missing")) setError("This page has not been saved on this device. Connect and open it first.");
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setForm((current) => ({ ...current, email: rememberedEmail }));
      setKeepLoggedIn(true);
    }

    // A returning user with a valid persistent session does not need to enter
    // credentials again, even if they reached the sign-in page directly.
    if (!offlineLogin) void getSession()
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

    if (offline) {
      setLoading(true);
      try {
        await offlineCommand("UNLOCK", { email: form.email, passphrase: form.password });
        // A document navigation also works when the worker has no Flight
        // response for the signed-out router tree.
        window.location.assign("/dashboard");
      } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not unlock offline access."); }
      finally { setLoading(false); }
      return;
    }

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
              <Label htmlFor="password">{offline ? "Offline passphrase" : "Password"}</Label>
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
              {offline ? "Unlock offline access" : "Sign in"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setOffline(value => !value); setForm(value => ({ ...value, password: "" })); setError(null); }}>{offline ? "Sign in online" : "Use offline passphrase"}</Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            New to Memoria?{" "}
            <Link href="/register" className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </p>
  </AuthFrame>;
}
