"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { stripCodeFences } from "@/lib/validation/reviewer";
import { AiSourcePicker, type AiKeySource } from "@/components/ai/ai-source-picker";

type Style = "preserve" | "balanced" | "condensed" | "exam_focused" | "visual_creative";

const STYLES: Array<{ value: Style; label: string }> = [
  { value: "balanced", label: "Balanced" },
  { value: "preserve", label: "Preserve detail" },
  { value: "condensed", label: "Condensed" },
  { value: "exam_focused", label: "Exam focused" },
  { value: "visual_creative", label: "Visual with SVG" },
];

export function RepromptDialog({ noteId, systemAvailable }: { noteId: string; systemAvailable: boolean }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<Style>("balanced");
  const [instruction, setInstruction] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generated, setGenerated] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<AiKeySource>(systemAvailable ? "system" : "personal");

  async function createPrompt(): Promise<string> {
    setBusy(true); setError(""); setGenerated("");
    const response = await fetch("/api/prompts/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ noteIds: [noteId], style, mode: "prompt" }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.error ?? "Could not create a reprompt."); setBusy(false); return ""; }
    const adjustment = instruction.trim() ? `\n\nUSER ADJUSTMENT\n${instruction.trim()}` : "";
    const nextPrompt = `${result.text}${adjustment}`;
    setPrompt(nextPrompt);
    setBusy(false);
    return nextPrompt;
  }

  async function runWithConnectedAi() {
    const sourcePrompt = prompt || await createPrompt();
    if (!sourcePrompt) return;
    setBusy(true); setError("");
    const response = await fetch("/api/ai/general", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: sourcePrompt, source }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.error ?? "Could not regenerate this memory."); setBusy(false); return; }
    setGenerated(stripCodeFences(result.text ?? ""));
    setBusy(false);
  }

  async function replaceMemory() {
    if (!generated.trim()) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/notes/${noteId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: generated }) });
    if (!response.ok) { const result = await response.json().catch(() => null); setError(result?.error ?? "Could not save the regenerated memory."); setBusy(false); return; }
    window.location.reload();
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard?.writeText(prompt);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><RefreshCw className="h-3.5 w-3.5" /> Reprompt</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Regenerate this memory" description="Tune the instruction, choose an AI key, and preview the result before replacing your current memory." className="max-w-2xl">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-ink">Direction
            <select value={style} onChange={(event) => setStyle(event.target.value as Style)} className="mt-1.5 h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink">
              {STYLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">Extra instruction <span className="font-normal text-ink-faint">(optional)</span>
            <Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={3} className="mt-1.5" placeholder="e.g. Make the comparison table easier to scan on a phone." />
          </label>
          {error && <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <AiSourcePicker value={source} onChange={setSource} systemAvailable={systemAvailable} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void createPrompt()} loading={busy}><Copy className="h-4 w-4" /> Create copy-ready prompt</Button>
            <Button type="button" onClick={() => void runWithConnectedAi()} loading={busy}><Sparkles className="h-4 w-4" /> Generate with selected AI</Button>
          </div>
          {prompt && <div><div className="mb-1.5 flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Prompt snippet</p><Button type="button" size="sm" variant="ghost" onClick={() => void copyPrompt()}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}</Button></div><Textarea value={prompt} readOnly rows={8} className="font-mono text-xs" /></div>}
          {generated && <div className="rounded-card border border-success/30 bg-success/5 p-4"><p className="text-sm font-medium text-ink">A new version is ready.</p><p className="mt-1 text-xs text-ink-soft">Review the generated content before replacing this memory.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" onClick={() => void replaceMemory()} loading={busy}>Replace memory</Button><Button type="button" variant="ghost" onClick={() => setGenerated("")}>Discard preview</Button></div></div>}
        </div>
      </Dialog>
    </>
  );
}
