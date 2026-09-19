"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AiSourcePicker, type AiKeySource } from "@/components/ai/ai-source-picker";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildTopicNotePrompt, type ProcessingStyle } from "@/lib/prompts/note-prompt";
import { stripCodeFences } from "@/lib/validation/reviewer";

const STYLES: Array<{ value: ProcessingStyle; label: string; description: string }> = [
  { value: "balanced", label: "Balanced", description: "Clear explanation with useful context and examples." },
  { value: "preserve", label: "Comprehensive", description: "Cover the topic broadly with more background and detail." },
  { value: "condensed", label: "Condensed", description: "Keep the essential ideas for a quick review." },
  { value: "exam_focused", label: "Exam focused", description: "Prioritize definitions, distinctions, and testable facts." },
  { value: "visual_creative", label: "Visual with SVG", description: "Add purposeful SVG visuals when they clarify the topic." },
];

export function GenerateNoteDialog({ systemAvailable }: { systemAvailable: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<ProcessingStyle>("balanced");
  const [source, setSource] = useState<AiKeySource>(systemAvailable ? "system" : "personal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function closeDialog(nextOpen: boolean) {
    if (busy) return;
    setOpen(nextOpen);
    if (!nextOpen) setError("");
  }

  async function generateNote() {
    const normalizedTopic = topic.trim();
    if (normalizedTopic.length < 3) {
      setError("Enter a topic with at least three characters.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const aiResponse = await fetch("/api/ai/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildTopicNotePrompt(normalizedTopic, style), source }),
      });
      const aiResult = await aiResponse.json().catch(() => null);
      if (!aiResponse.ok) {
        setError(aiResult?.error ?? "Could not generate the note.");
        return;
      }

      const content = stripCodeFences(String(aiResult?.text ?? "")).trim();
      if (!content) {
        setError("The AI returned an empty note. Try a more specific topic.");
        return;
      }

      const noteResponse = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTopic.slice(0, 200), content }),
      });
      const noteResult = await noteResponse.json().catch(() => null);
      if (!noteResponse.ok || !noteResult?.note?.id) {
        setError(noteResult?.error ?? "The note was generated but could not be saved.");
        return;
      }

      setOpen(false);
      setTopic("");
      router.push(`/notes/${noteResult.note.id}`);
      router.refresh();
    } catch {
      setError("We couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Sparkles className="h-4 w-4" /> Generate note
      </Button>
      <Dialog
        open={open}
        onOpenChange={closeDialog}
        title="Generate a note"
        description="Give Memoria a topic and it will create a new, editable note for you."
        className="max-w-xl"
      >
        <div className="space-y-5">
          <label className="block text-sm font-medium text-ink" htmlFor="generate-note-topic">
            Topic
            <Input
              id="generate-note-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void generateNote(); } }}
              placeholder="e.g. How TCP congestion control works"
              className="mt-1.5"
              autoFocus
            />
          </label>

          <label className="block text-sm font-medium text-ink" htmlFor="generate-note-style">
            Note style
            <select id="generate-note-style" value={style} onChange={(event) => setStyle(event.target.value as ProcessingStyle)} className="mt-1.5 h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink">
              {STYLES.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
            </select>
          </label>

          <AiSourcePicker value={source} onChange={setSource} systemAvailable={systemAvailable} />
          {error && <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => closeDialog(false)} disabled={busy}>Cancel</Button>
            <Button type="button" onClick={() => void generateNote()} loading={busy} disabled={!topic.trim()}>Generate note</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
