"use client";
import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "@/components/ui/toast";
import { workspaceSvgPrompt } from "@/lib/workspaces/svg-prompt";
import { generatedVisualIssues } from "@/lib/ai/output-quality";
import { stripCodeFences } from "@/lib/validation/reviewer";

export function SvgHelper({ context, onInsert }: { context: string; onInsert: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [details, setDetails] = useState("");
  const [includeContext, setIncludeContext] = useState(false);
  const [source, setSource] = useState("system");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prompt = workspaceSvgPrompt(request, details, includeContext ? context.slice(0, 60_000) : "");
  const normalizedResult = stripCodeFences(result);
  const issues = normalizedResult ? generatedVisualIssues(normalizedResult) : [];
  const valid = normalizedResult.includes(":::svg") && /<svg\b/.test(normalizedResult) && issues.length === 0;
  return <><Button variant="outline" onClick={() => setOpen(true)}><Sparkles className="h-4 w-4" />SVG helper</Button><Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }} title="What would you like to add?" description="Describe the visual and its required information. Generate here or copy a prompt to your preferred AI tool." className="overflow-y-auto sm:max-w-3xl">
    <div className="space-y-4"><div><Label htmlFor="svg-request">What should this visual explain?</Label><Input id="svg-request" value={request} maxLength={2000} onChange={event => setRequest(event.target.value)} placeholder="For example, a labeled diagram of the water cycle" /></div><div><Label htmlFor="svg-details">Facts, labels, relationships, and style</Label><textarea id="svg-details" value={details} onChange={event => setDetails(event.target.value)} maxLength={8000} rows={4} className="w-full rounded-control border border-line bg-surface p-3 text-sm" placeholder="Include the stages, units, key facts, and anything the visual must show." /></div>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={includeContext} onChange={event => setIncludeContext(event.target.checked)} />Include this note as context (up to 60,000 characters)</label><p className="text-xs text-ink-soft">Generating sends these instructions and any selected context to the chosen AI service. Other workspace notes are not included.</p>
    <div><Label htmlFor="svg-source">AI connection</Label><select id="svg-source" value={source} onChange={event => setSource(event.target.value)} className="min-h-11 w-full rounded-control border border-line bg-surface px-3 text-sm"><option value="system">Provided AI</option><option value="personal">My AI connections</option></select></div>
    <div className="flex flex-wrap gap-2"><Button disabled={!request.trim()} loading={busy} onClick={async () => {
      setBusy(true); setError("");
      try { const response = await fetch("/api/ai/general", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, source }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data.text); }
      catch (error) { setError(error instanceof Error ? error.message : "Generation failed. Try again or copy the prompt."); }
      finally { setBusy(false); }
    }}><Sparkles className="h-4 w-4" />Generate visual</Button><Button variant="outline" disabled={!request.trim() || busy} onClick={async () => { try { await navigator.clipboard.writeText(prompt); toast("SVG prompt copied. Paste it into your AI tool."); } catch { setError("Copying was blocked. Select the prompt below and copy it manually."); } }}><Copy className="h-4 w-4" />Copy prompt</Button></div>
    <details><summary className="cursor-pointer text-sm">View prompt</summary><textarea aria-label="SVG generation prompt" readOnly value={prompt} rows={6} className="mt-2 w-full rounded-control border border-line bg-surface p-3 text-xs" /></details>
    {busy && <LoadingState label="Generating your visual. This can take a moment." rows={2} />}{error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div><Label htmlFor="svg-result">Generated result or response from your AI tool</Label><textarea id="svg-result" rows={5} value={result} maxLength={90_000} onChange={event => setResult(event.target.value)} className="w-full rounded-control border border-line bg-surface p-3 font-mono text-xs" placeholder="Paste the complete :::svg block and explanation here." /></div>
    {result && <><p className="text-xs text-ink-soft">Review the labels and facts before inserting. Structural validation cannot verify factual accuracy.</p>{!valid && <p role="alert" className="text-sm text-danger">{issues.length ? issues.join(" ") : "Include a complete :::svg block containing an SVG."}</p>}<div className="max-h-96 overflow-auto rounded-card border border-line bg-surface p-4"><MarkdownRenderer content={normalizedResult} /></div><Button disabled={!valid || busy} onClick={() => { onInsert(normalizedResult); setOpen(false); toast("Visual added to your draft."); }}>Insert into note</Button></>}
    </div>
  </Dialog></>;
}
