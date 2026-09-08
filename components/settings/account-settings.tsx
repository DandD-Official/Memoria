"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AccountSettings({ initial }: { initial: { name: string; email: string } }) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState<"profile" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setBusy("profile"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't update your account.");
      setCurrentPassword(""); setNewPassword("");
      if (data.requiresVerification) {
        window.location.assign(`/verify-email?sent=1&email=${encodeURIComponent(data.user.email)}`);
        return;
      }
      setMessage("Account updated.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't reach the server."); }
    finally { setBusy(null); }
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your Memoria account and all its data? This cannot be undone.")) return;
    setBusy("delete"); setError(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: deletePassword }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Couldn't delete your account.");
      await signOut({ callbackUrl: "/" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't reach the server."); setBusy(null); }
  }

  return <section id="account" className="card mt-5 scroll-mt-24 p-5">
    <h2 className="font-display text-lg text-ink">Account and privacy</h2>
    <p className="mt-1 text-sm text-ink-soft">Update your identity, password, or download everything stored in your account.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="account-name">Name</Label><Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Required for email/password changes" /></div><div><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Leave blank to keep current" /></div></div>
    {error && <p className="mt-3 text-sm text-danger">{error}</p>}{message && <p className="mt-3 text-sm text-success">{message}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={saveProfile} loading={busy === "profile"}>Save account</Button><a href="/api/account/export" className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-ink/5">Download my data</a></div>
    <div className="mt-8 rounded-lg border border-danger/30 p-4"><h3 className="text-sm font-semibold text-danger">Delete account</h3><p className="mt-1 text-xs text-ink-soft">This permanently removes Memories, Books, reviewers, quizzes, attempts, and connections.</p><div className="mt-3 flex gap-2"><Input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Confirm with your password" /><Button variant="danger" disabled={!deletePassword} loading={busy === "delete"} onClick={deleteAccount}>Delete</Button></div></div>
  </section>;
}
