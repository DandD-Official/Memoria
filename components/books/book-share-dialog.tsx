"use client";

import { useState } from "react";
import { Check, Copy, Link2, LockKeyhole, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type BookSharePermission = "VIEW" | "EDIT";
export interface BookMember {
  id: string;
  name: string;
  email: string;
  permission: BookSharePermission;
}

interface BookShareDialogProps {
  bookId: string;
  publicPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkEnabled: boolean;
  linkPermission: BookSharePermission;
  passwordProtected: boolean;
  members: BookMember[];
  onChanged: (changes: { linkEnabled?: boolean; linkPermission?: BookSharePermission; passwordProtected?: boolean; members?: BookMember[] }) => void;
}

export function BookShareDialog(props: BookShareDialogProps) {
  const [method, setMethod] = useState<"link" | "people">("link");
  const [email, setEmail] = useState("");
  const [personPermission, setPersonPermission] = useState<BookSharePermission>("VIEW");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateBook(body: Record<string, unknown>) {
    setBusy("link");
    setError(null);
    try {
      const response = await fetch(`/api/collections/${props.bookId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setError(data?.error ?? "Couldn't update sharing."); return false; }
      return true;
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function setLinkEnabled(enabled: boolean) {
    if (await updateBook({ isPublished: enabled })) props.onChanged({ linkEnabled: enabled });
  }

  async function setLinkPermission(permission: BookSharePermission) {
    if (await updateBook({ linkPermission: permission })) props.onChanged({ linkPermission: permission });
  }

  async function clearPassword() {
    if (await updateBook({ password: null })) props.onChanged({ passwordProtected: false });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${props.publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function addPerson() {
    if (!email.trim()) return;
    setBusy("person");
    setError(null);
    const response = await fetch(`/api/collections/${props.bookId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), permission: personPermission }) });
    const data = await response.json().catch(() => null);
    setBusy(null);
    if (!response.ok) { setError(data?.error ?? "Couldn't add this person."); return; }
    const next: BookMember = { id: data.member.id, name: data.member.user.name, email: data.member.user.email, permission: data.member.permission };
    props.onChanged({ members: [...props.members.filter((member) => member.id !== next.id), next] });
    setEmail("");
  }

  async function changePerson(memberId: string, permission: BookSharePermission) {
    setBusy(memberId);
    setError(null);
    const response = await fetch(`/api/collections/${props.bookId}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, permission }) });
    const data = await response.json().catch(() => null);
    setBusy(null);
    if (!response.ok) { setError(data?.error ?? "Couldn't change access."); return; }
    props.onChanged({ members: props.members.map((member) => member.id === memberId ? { ...member, permission: data.member.permission } : member) });
  }

  async function removePerson(memberId: string) {
    setBusy(memberId);
    setError(null);
    const response = await fetch(`/api/collections/${props.bookId}/members?memberId=${memberId}`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) { const data = await response.json().catch(() => null); setError(data?.error ?? "Couldn't remove this person."); return; }
    props.onChanged({ members: props.members.filter((member) => member.id !== memberId) });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} title="Share this Book" description="Choose how people enter the Book and what they can change." className="max-w-xl">
      <div className="grid grid-cols-2 gap-2 rounded-card bg-surface-muted p-1" role="tablist" aria-label="Sharing method">
        <MethodButton active={method === "link"} onClick={() => setMethod("link")} icon={Link2} label="Anyone with link" />
        <MethodButton active={method === "people"} onClick={() => setMethod("people")} icon={Users} label="Add people" />
      </div>

      {method === "link" ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface p-4">
            <div><p className="text-sm font-semibold text-ink">Anyone with the link</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">{props.linkEnabled ? "The link is active." : "Only people already added to the Book can open it."}</p></div>
            <button type="button" role="switch" aria-checked={props.linkEnabled} disabled={busy === "link"} onClick={() => void setLinkEnabled(!props.linkEnabled)} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-wait disabled:opacity-60", props.linkEnabled ? "bg-action" : "bg-ink/20")}>
              <span className={cn("absolute left-0 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", props.linkEnabled ? "translate-x-6" : "translate-x-1")} />
              <span className="sr-only">{props.linkEnabled ? "Disable link" : "Enable link"}</span>
            </button>
          </div>

          <div><Label htmlFor="book-link-access">Access</Label><Select id="book-link-access" value={props.linkPermission} disabled={busy === "link"} onChange={(event) => void setLinkPermission(event.target.value as BookSharePermission)}><option value="VIEW">Viewer — can read</option><option value="EDIT">Editor — can arrange and edit the Book</option></Select>{props.linkPermission === "EDIT" && <p className="mt-1.5 text-xs text-ink-faint">Link editors must sign in to Memoria before making changes.</p>}</div>

          <div className={cn("flex min-w-0 items-center gap-2 rounded-card border border-line bg-paper p-2", !props.linkEnabled && "opacity-55")}>
            <span className="min-w-0 flex-1 truncate pl-2 text-sm text-ink-soft">{props.publicPath}</span>
            <Button size="sm" variant="outline" disabled={!props.linkEnabled} onClick={() => void copyLink()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</Button>
          </div>

          {props.passwordProtected && <div className="flex items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning/5 p-3"><p className="flex items-center gap-2 text-xs text-ink-soft"><LockKeyhole className="h-4 w-4 text-warning" />This legacy link still requires a password.</p><Button size="sm" variant="ghost" onClick={() => void clearPassword()}>Remove password</Button></div>}
        </div>
      ) : (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_auto] sm:items-end">
            <div><Label htmlFor="book-person-email">Email</Label><Input id="book-person-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addPerson()} placeholder="person@example.com" /></div>
            <div><Label htmlFor="book-person-access">Access</Label><Select id="book-person-access" value={personPermission} onChange={(event) => setPersonPermission(event.target.value as BookSharePermission)}><option value="VIEW">Viewer</option><option value="EDIT">Editor</option></Select></div>
            <Button onClick={() => void addPerson()} loading={busy === "person"} disabled={!email.trim()}><UserPlus className="h-4 w-4" />Add</Button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">People in this Book</p>
            {props.members.length === 0 ? <p className="mt-3 rounded-card border border-dashed border-line p-5 text-center text-sm text-ink-faint">No one has been added yet.</p> : <div className="mt-2 divide-y divide-line rounded-card border border-line">{props.members.map((member) => <div key={member.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-dark">{(member.name || member.email).charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{member.name || member.email}</p><p className="truncate text-xs text-ink-faint">{member.email}</p></div></div><div className="flex items-center gap-2"><Select aria-label={`Access for ${member.email}`} value={member.permission} disabled={busy === member.id} onChange={(event) => void changePerson(member.id, event.target.value as BookSharePermission)} className="h-9 min-w-28"><option value="VIEW">Viewer</option><option value="EDIT">Editor</option></Select><button type="button" disabled={busy === member.id} onClick={() => void removePerson(member.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-faint hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${member.email}`}><X className="h-4 w-4" /></button></div></div>)}</div>}
          </div>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
    </Dialog>
  );
}

function MethodButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Link2; label: string }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-medium transition-colors", active ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><Icon className="h-4 w-4" />{label}</button>;
}
