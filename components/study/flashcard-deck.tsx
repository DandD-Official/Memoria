"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Pencil, RefreshCw, Trash2 } from "lucide-react";
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

  useEffect(() => {
    if (!tracked) return;
    fetch("/api/study/sessions", { method: "POST" }).then((response) => response.json()).then((data) => setSessionId(data.session?.id ?? null)).catch(() => {});
  }, [tracked]);

  const card = cards[index];
  const done = index >= cards.length;

  async function grade(value: 1 | 2 | 3 | 4) {
    if (!card || saving) return;
    setSaving(true);
    if (tracked) {
      const response = await fetch(`/api/flashcards/${card.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade: value, sessionId }) });
      if (!response.ok) { setSaving(false); return; }
    }
    if (value >= 3) setKnownCount((count) => count + 1);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setFlipped(false);
    setSaving(false);
    if (nextIndex >= cards.length && sessionId) void fetch("/api/study/sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
  }

  function restart() { setIndex(0); setKnownCount(0); setFlipped(false); }

  function beginEdit() { if (!card) return; setFront(card.front); setBack(card.back); setEditing(true); }
  async function saveEdit() {
    if (!card) return;
    setSaving(true);
    const response = await fetch(`/api/flashcards/${card.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ front, back }) });
    if (response.ok) setCards((current) => current.map((item) => item.id === card.id ? { ...item, front: front.trim(), back: back.trim() } : item));
    setSaving(false); if (response.ok) setEditing(false);
  }
  async function removeCard() {
    if (!card) return;
    setSaving(true);
    const response = await fetch(`/api/flashcards/${card.id}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json().catch(() => null); setSaving(false); throw new Error(data?.error ?? "Could not delete this flashcard."); }
    setCards((current) => current.filter((item) => item.id !== card.id)); setFlipped(false);
    setSaving(false);
  }
  function exportCsv() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["Front,Back", ...cards.map((item) => `${quote(item.front)},${quote(item.back)}`)].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "flashcards"}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="mx-auto max-w-xl">
    <Link href="/study" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to study</Link>
    <div className="mb-1 flex items-center justify-between gap-3"><h1 className="font-display text-xl text-ink">{title}</h1><Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV</Button></div>
    {done ? <div className="card mt-6 p-8 text-center"><p className="font-display text-2xl text-ink">Session complete</p><p className="mt-1 text-sm text-ink-soft">You rated {knownCount} of {cards.length} cards Good or Easy.</p><Button variant="outline" className="mt-5" onClick={restart}><RefreshCw className="h-4 w-4" /> Study again</Button></div> : <>
      <p className="mb-3 text-xs text-ink-faint">Card {index + 1} of {cards.length}</p>
      {editing ? <div className="card space-y-3 p-5"><div><Label htmlFor="card-front">Front</Label><Input id="card-front" value={front} onChange={(event) => setFront(event.target.value)} /></div><div><Label htmlFor="card-back">Back</Label><Textarea id="card-back" rows={5} value={back} onChange={(event) => setBack(event.target.value)} /></div><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button loading={saving} disabled={!front.trim() || !back.trim()} onClick={() => void saveEdit()}>Save</Button></div></div> : <button type="button" onClick={() => setFlipped((value) => !value)} className={cn("card flex min-h-[220px] w-full items-center justify-center p-8 text-center transition-colors", flipped ? "bg-accent-soft/40" : "bg-surface")}><span className="font-display text-lg text-ink">{flipped ? card.back : card.front}</span></button>}
      <p className="mt-2 text-center text-xs text-ink-faint">Tap the card to flip it</p>
      {tracked && !editing && <div className="mt-2 flex justify-center gap-2"><Button variant="ghost" size="sm" onClick={beginEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button><ConfirmDialog trigger={<Button variant="ghost" size="sm" disabled={saving}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>} title="Delete this flashcard?" description="This card will be removed from the deck and your study history." confirmLabel="Delete card" destructive onConfirm={removeCard} /></div>}
      {flipped && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" disabled={saving} onClick={() => grade(1)}>Again</Button><Button variant="outline" disabled={saving} onClick={() => grade(2)}>Hard</Button><Button variant="outline" disabled={saving} onClick={() => grade(3)}>Good</Button><Button disabled={saving} onClick={() => grade(4)}>Easy</Button></div>}
    </>}
  </div>;
}
