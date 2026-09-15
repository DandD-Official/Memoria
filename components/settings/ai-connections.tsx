"use client";

import { useState } from "react";
import { Bot, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Provider = "OPENAI" | "ANTHROPIC" | "GEMINI";
const LABELS: Record<Provider, string> = { OPENAI: "OpenAI", ANTHROPIC: "Anthropic", GEMINI: "Google Gemini" };
type Connection = { id: string; provider: Provider; label: string | null; model: string | null; updatedAt: string | Date };

export function AiConnections({ initialConnections, defaults }: { initialConnections: Connection[]; defaults: Record<Provider, string> }) {
  const [connections, setConnections] = useState(initialConnections);
  const [provider, setProvider] = useState<Provider>("OPENAI");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(defaults.OPENAI);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/ai/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, model, label }) });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setConnections((current) => [payload.connection, ...current]);
      setApiKey(""); setLabel(""); setMessage(`${LABELS[provider]} key added.`);
    } else setMessage(payload?.error ?? "Couldn't save the connection.");
    setBusy(false);
  }

  async function remove(targetId: string) {
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/ai/connections?id=${encodeURIComponent(targetId)}`, { method: "DELETE" });
    if (response.ok) setConnections((current) => current.filter((item) => item.id !== targetId));
    else setMessage("Couldn't remove the connection.");
    setBusy(false);
  }

  return (
    <section id="ai-providers" className="card mt-5 scroll-mt-24 p-5">
      <div className="mb-3 flex items-center gap-2"><Bot className="h-5 w-5 text-accent" /><h2 className="font-display text-xl text-ink">AI providers</h2></div>
      <p className="mb-4 text-sm text-ink-soft">Use your own provider keys for one-click generation. Add one key, save it, then repeat for each backup key. Fallback 1 is tried first, followed by the next saved key if a provider rejects the request. Keys are encrypted and never shown again.</p>
      <div className="space-y-4 rounded-lg border border-line p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="ai-provider">Provider</Label><select id="ai-provider" value={provider} onChange={(event) => { const next = event.target.value as Provider; setProvider(next); setModel(defaults[next]); }} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{(Object.keys(LABELS) as Provider[]).map((item) => <option key={item} value={item}>{LABELS[item]}</option>)}</select></div>
          <div><Label htmlFor="ai-model">Model</Label><Input id="ai-model" value={model} onChange={(event) => setModel(event.target.value)} /></div>
        </div>
        <div><Label htmlFor="ai-key-label">Key label <span className="font-normal text-ink-faint">(optional)</span></Label><Input id="ai-key-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Work key or backup" /></div>
        <div><Label htmlFor="ai-key">API key</Label><Input id="ai-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste a provider API key" /></div>
        <Button size="sm" onClick={() => void save()} loading={busy} disabled={apiKey.trim().length < 8}><KeyRound className="h-3.5 w-3.5" /> Save encrypted key</Button>
      </div>
      {connections.length > 0 && <div className="mt-3 space-y-2">{connections.map((item, index) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{LABELS[item.provider]}{item.label ? ` · ${item.label}` : ""}</p><p className="text-xs text-ink-soft">Fallback {index + 1} · {item.model || defaults[item.provider]}</p></div><Button variant="ghost" size="sm" onClick={() => void remove(item.id)} disabled={busy}><Trash2 className="h-3.5 w-3.5" /> Remove</Button></div>)}</div>}
      {message && <p className="mt-3 text-sm text-ink-soft" role="status">{message}</p>}
    </section>
  );
}
