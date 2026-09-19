"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Download, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
interface Card { id: string; front: string; back: string }

export function FlashcardDeck({ title, cards: initialCards, tracked }: { title: string; cards: Card[]; tracked: boolean }) {
  const [cards, setCards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sessionRequest = useRef<Promise<string | null> | null>(null);
  const card = cards[index];
  const done = index >= cards.length;

  useEffect(() => {
    if (!tracked || initialCards.length === 0) return;
    if (!sessionRequest.current) sessionRequest.current = fetch("/api/study/sessions", { method: "POST" }).then(response => response.json()).then(data => data.session?.id ?? null).catch(() => null);
    let active = true;
    void sessionRequest.current.then(id => { if (active) { setSessionId(id); if (!id) setError("Session tracking could not connect. Card reviews will still save individually; reload to retry session tracking."); } });
    return () => { active = false; };
  }, [tracked, initialCards.length]);

  useEffect(() => {
    if (done || editing) return;
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select, summary, [contenteditable]") || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === " ") { event.preventDefault(); setFlipped(value => !value); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [done, editing]);

  async function grade(value: 1 | 2 | 3 | 4) {
    if (!card || saving || !flipped) return;
    setSaving(true); setError(null);
    try {
      if (tracked) {
        const response = await fetch(`/api/flashcards/${card.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade: value, sessionId }) });
        if (!response.ok) throw new Error("Your review could not be saved. Check your connection and choose a rating again.");
      }
      if (value >= 3) setKnownCount(count => count + 1);
      const nextIndex = index + 1;
      setIndex(nextIndex); setFlipped(false);
      if (nextIndex >= cards.length && sessionId) {
        const response = await fetch("/api/study/sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        if (!response.ok) setError("Your card reviews are saved. The session summary could not finish syncing.");
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The review could not connect. Try your rating again."); }
    finally { setSaving(false); }
  }
  async function restart() {
    setError(null);
    if (tracked) {
      setSaving(true);
      try {
        const response = await fetch("/api/study/sessions", { method: "POST" });
        const data = await response.json();
        if (!response.ok || !data.session?.id) throw new Error();
        setSessionId(data.session.id);
      } catch { setError("A new session could not start. Check your connection and try again."); return; }
      finally { setSaving(false); }
    }
    setIndex(0); setKnownCount(0); setFlipped(false);
  }
  function beginEdit() { if (!card) return; setFront(card.front); setBack(card.back); setEditing(true); }
  async function saveEdit() {
    if (!card) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/flashcards/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ front, back }) });
      if (!response.ok) throw new Error();
      setCards(current => current.map(item => item.id === card.id ? { ...item, front: front.trim(), back: back.trim() } : item));
      setEditing(false);
    } catch { setError("This edit could not be saved. Your text is still here; try saving again."); }
    finally { setSaving(false); }
  }
  async function removeCard() {
    if (!card) return;
    const response = await fetch(`/api/flashcards/${card.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("This card could not be deleted. Check your connection and try again.");
    setCards(current => current.filter(item => item.id !== card.id)); setFlipped(false);
  }
  function exportCsv() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["Front,Back", ...cards.map(item => `${quote(item.front)},${quote(item.back)}`)].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "flashcards"}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-2xl">
    <header className="border-b border-line pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow">Focus / A thought at a time</p><Button variant="ghost" size="sm" onClick={exportCsv}><Download className="h-4 w-4" />Export cards</Button></div><h1 className="mt-3 break-words font-display text-2xl tracking-tight">{title}</h1></header>
    {error && <p className="mt-5 border-s-2 border-danger ps-4 text-sm text-danger" role="alert">{error}</p>}
    {done ? <section className="py-12 text-center"><Check className="mx-auto h-9 w-9 text-success" /><h2 className="mt-6 font-display text-3xl tracking-tight">{cards.length ? "A little more remembered." : "A fresh deck awaits."}</h2><p className="mt-4 text-sm leading-relaxed text-ink-soft">{cards.length ? `You rated ${knownCount} of ${cards.length} cards Good or Easy. ${tracked ? "Your next reviews follow your saved ratings." : ""}` : "There are no cards in this deck. Choose a study guide to create one."}</p><div className="mt-8 flex flex-wrap justify-center gap-3">{cards.length > 0 && <Button variant="outline" onClick={() => void restart()} loading={saving}><RefreshCw className="h-4 w-4" />Review again</Button>}<Link href="/study" className="journal-link">Return to practice<ArrowRight className="h-4 w-4" /></Link></div></section> : <>
      <div className="my-6 flex items-center justify-between gap-4"><p className="index-label">Thought {index + 1} / {cards.length}</p><span className="text-xs text-ink-faint">{index} reviewed</span></div>
      <div role="progressbar" aria-label="Cards reviewed" aria-valuemin={0} aria-valuemax={cards.length} aria-valuenow={index} className="mb-7 h-1 bg-line"><div className="h-full bg-action" style={{ width: `${index / cards.length * 100}%` }} /></div>
      {editing ? <section className="border-y border-line bg-surface p-5 sm:p-8"><h2 className="mb-5 font-display text-xl">Shape this card</h2><div className="space-y-4"><div><Label htmlFor="card-front">The question or idea</Label><Input id="card-front" value={front} onChange={event => setFront(event.target.value)} /></div><div><Label htmlFor="card-back">What you want to remember</Label><Textarea id="card-back" rows={5} value={back} onChange={event => setBack(event.target.value)} /></div><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button><Button loading={saving} disabled={!front.trim() || !back.trim()} onClick={() => void saveEdit()}>Save card</Button></div></div></section> :
      <button type="button" aria-pressed={flipped} aria-label={flipped ? "Show the prompt again" : "Reveal the answer"} onClick={() => setFlipped(value => !value)} className={cn("flex min-h-[310px] w-full flex-col items-center justify-center gap-7 border-y border-line px-6 py-10 text-center sm:min-h-[350px] sm:px-10", flipped ? "bg-accent-soft/60" : "bg-surface")}><span className="index-label">{flipped ? "The connection" : "Recall before you reveal"}</span><span className="max-w-xl whitespace-pre-wrap break-words font-display text-2xl leading-relaxed sm:text-3xl">{flipped ? card.back : card.front}</span><span className="mt-3 text-xs text-ink-soft">{flipped ? "Select to see the prompt again" : "Think it through. Select to reveal."}</span></button>}
      {flipped && !editing && <section className="mt-7"><h2 className="text-center text-sm text-ink-soft">How did that feel?</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{([{ grade: 1, label: "Again", hint: "It slipped away" }, { grade: 2, label: "Hard", hint: "Needed a hint" }, { grade: 3, label: "Good", hint: "I remembered" }, { grade: 4, label: "Easy", hint: "Came naturally" }] as const).map(item => <button key={item.grade} type="button" disabled={saving} onClick={() => void grade(item.grade)} className="min-h-20 rounded-control border border-line-strong bg-surface p-3 text-center hover:border-action hover:bg-accent-soft disabled:opacity-50"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-[11px] text-ink-soft">{item.hint}</span></button>)}</div><p role="status" className="mt-3 min-h-5 text-center text-xs text-ink-faint">{saving ? "Saving your review?" : tracked ? "Your rating sets the next review." : "This practice is not saved."}</p></section>}
      {tracked && !editing && <details className="mt-6 text-center"><summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-ink-faint">Manage this card</summary><div className="mt-2 flex justify-center gap-3"><Button variant="ghost" size="sm" onClick={beginEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button><ConfirmDialog trigger={<Button variant="ghost" size="sm" disabled={saving}><Trash2 className="h-3.5 w-3.5 text-danger" />Delete</Button>} title="Delete this flashcard?" description="The card and its review history will be removed." confirmLabel="Delete card" destructive onConfirm={removeCard} /></div></details>}
    </>}
  </div>;
}
