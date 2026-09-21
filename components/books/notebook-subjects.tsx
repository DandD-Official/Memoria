"use client";
import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { NotebookSubject } from "@/lib/books/notebooks";

export function NotebookSubjects({ subjects, save, busy }: { subjects: NotebookSubject[]; save: (subjects: NotebookSubject[]) => Promise<boolean>; busy: boolean }) {
  const [title, setTitle] = useState("");
  async function add() { if (!title.trim()) return; if (await save([...subjects, { id: crypto.randomUUID(), title: title.trim() }])) setTitle(""); }
  function move(index: number, offset: number) { const next = [...subjects]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; void save(next); }
  return <section className="mb-6 rounded-card border border-line bg-surface-muted p-4" aria-label="Notebook titles">
    <Label htmlFor="new-subject">Titles</Label><p className="mb-3 text-sm text-ink-soft">Add a title, then choose the memories to place beneath it.</p>
    <div className="flex gap-2"><Input id="new-subject" placeholder="Title" value={title} maxLength={120} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !busy) void add(); }} /><Button disabled={busy || !title.trim() || subjects.length >= 50} onClick={() => void add()}><Plus className="h-4 w-4" />Add</Button></div>
    <ol className="mt-3 divide-y divide-line">{subjects.map((subject, index) => <li key={subject.id} className="flex items-center gap-1 py-2">
      <input key={`${subject.id}-${subject.title}`} aria-label={`Rename ${subject.title}`} defaultValue={subject.title} maxLength={120} disabled={busy} className="min-h-11 min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 text-base focus:border-line" onBlur={event => { const value = event.target.value.trim(); if (value && value !== subject.title) void save(subjects.map(row => row.id === subject.id ? { ...row, title: value } : row)); }} />
      <Button variant="ghost" disabled={busy || index === 0} aria-label={`Move ${subject.title} up`} onClick={() => move(index, -1)}><ChevronUp className="h-4 w-4" /></Button><Button variant="ghost" disabled={busy || index === subjects.length - 1} aria-label={`Move ${subject.title} down`} onClick={() => move(index, 1)}><ChevronDown className="h-4 w-4" /></Button>
      <Button variant="ghost" disabled={busy} aria-label={`Remove ${subject.title}`} onClick={() => { if (window.confirm(`Remove ${subject.title}? Its memories will remain in Unfiled.`)) void save(subjects.filter(row => row.id !== subject.id)); }}><Trash2 className="h-4 w-4" /></Button>
    </li>)}</ol>
  </section>;
}
