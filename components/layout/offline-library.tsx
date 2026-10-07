"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, FileText, Layers, ListChecks, Search, Workflow } from "lucide-react";
import { MmdRenderer as MarkdownRenderer } from "@/components/mmd/renderer";
import { diagramToSvg } from "@/lib/diagrams/svg";
import { diagramDataSchema } from "@/lib/diagrams/schema";
import { readOfflineSnapshot, saveOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-store";

type FileKind = "note" | "guide" | "quiz" | "diagram" | "book" | "notebook" | "flashcards";
type OfflineFile = { id: string; title: string; kind: FileKind; updatedAt: string };
const labels: Record<FileKind, string> = { note: "Source note", guide: "Study guide", quiz: "Quiz", diagram: "Diagram", book: "Book", notebook: "Notebook", flashcards: "Flashcards" };
const icons = { note: FileText, guide: Layers, quiz: ListChecks, diagram: Workflow, book: BookOpen, notebook: BookOpen, flashcards: BookOpen };

function OfflineQuizQuestion({ question, index }: { question: Record<string, unknown>; index: number }) {
  const choices = Array.isArray(question.choices) ? question.choices : Array.isArray(question.options) ? question.options : [];
  const rawAnswer = question.answer;
  const answer = Array.isArray(rawAnswer) ? rawAnswer.map(value => typeof value === "number" ? choices[value] ?? value : value).join(", ")
    : typeof rawAnswer === "number" && choices.length ? String(choices[rawAnswer] ?? rawAnswer)
      : typeof rawAnswer === "boolean" ? rawAnswer ? "True" : "False"
        : typeof rawAnswer === "string" ? rawAnswer : null;
  const moreAnswers = question.acceptableAnswers ?? question.pairs;
  return <section className="border-b border-line pb-5"><h3 className="font-medium">{String(question.question ?? question.prompt ?? question.text ?? `Question ${index + 1}`)}</h3>{choices.length > 0 && <ol type="A" className="mt-3 list-inside list-[upper-alpha] space-y-2 text-sm text-ink-soft">{choices.map((option, optionIndex) => <li key={optionIndex}>{typeof option === "string" ? option : JSON.stringify(option)}</li>)}</ol>}<details className="mt-3"><summary className="min-h-10 cursor-pointer py-2 text-sm font-medium text-accent-dark">Check answer and explanation</summary>{answer !== null && <p className="mt-2 text-sm"><strong>Answer:</strong> {answer}</p>}{moreAnswers !== undefined && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Accepted answers:</strong> {JSON.stringify(moreAnswers)}</p>}{typeof question.explanation === "string" && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{question.explanation}</p>}</details></section>;
}

export function OfflineLibrary() {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [selection, setSelection] = useState<{ kind: FileKind; id: string } | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const files = useMemo<OfflineFile[]>(() => snapshot ? [
    ...snapshot.notes.map(item => ({ id: item.id, title: item.title, kind: "note" as const, updatedAt: item.updatedAt })),
    ...snapshot.reviewers.map(item => ({ id: item.id, title: item.title, kind: "guide" as const, updatedAt: item.updatedAt })),
    ...snapshot.quizzes.map(item => ({ id: item.id, title: item.title, kind: "quiz" as const, updatedAt: item.updatedAt })),
    ...snapshot.diagrams.map(item => ({ id: item.id, title: item.title, kind: "diagram" as const, updatedAt: item.updatedAt })),
    ...snapshot.collections.map(item => ({ id: item.id, title: item.title, kind: item.kind === "NOTEBOOK" ? "notebook" as const : "book" as const, updatedAt: item.updatedAt })),
    ...(snapshot.flashcards.length ? [{ id: "offline-flashcards", title: `${snapshot.flashcards.length} saved flashcards`, kind: "flashcards" as const, updatedAt: snapshot.syncedAt }] : []),
  ].filter(file => file.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) : [], [query, snapshot]);

  useEffect(() => {
    let alive = true;
    let syncing = false;
    const load = () => void readOfflineSnapshot().then(value => { if (alive) setSnapshot(value); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    const updateNetwork = () => setOnline(navigator.onLine);
    const syncSavedAccount = async () => {
      if (!navigator.onLine || document.visibilityState === "hidden" || syncing) return;
      syncing = true;
      try {
        const current = await readOfflineSnapshot();
        if (!current) return;
        const response = await fetch("/api/offline/snapshot", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const next = await response.json() as OfflineSnapshot;
        if (next.account.id !== current.account.id || !alive) return;
        await saveOfflineSnapshot(next);
        if (alive) setSnapshot(next);
      } catch { /* Keep the last complete copy if online refresh is unavailable. */ }
      finally { syncing = false; }
    };
    const backOnline = () => { updateNetwork(); void syncSavedAccount(); };
    load(); updateNetwork(); void syncSavedAccount();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void syncSavedAccount(); }, 5 * 60_000);
    window.addEventListener("online", backOnline); window.addEventListener("offline", updateNetwork);
    window.addEventListener("focus", syncSavedAccount);
    document.addEventListener("visibilitychange", syncSavedAccount);
    window.addEventListener("memoria:offline-synced", load);
    return () => { alive = false; clearInterval(interval); window.removeEventListener("online", backOnline); window.removeEventListener("offline", updateNetwork); window.removeEventListener("focus", syncSavedAccount); document.removeEventListener("visibilitychange", syncSavedAccount); window.removeEventListener("memoria:offline-synced", load); };
  }, []);

  const selected = selection ? files.find(file => file.id === selection.id && file.kind === selection.kind) : null;
  const collection = selected && (selected.kind === "book" || selected.kind === "notebook") ? snapshot?.collections.find(item => item.id === selected.id) : null;
  const linkedFiles = collection?.items.flatMap(item => {
    const kind = item.resourceType === "NOTE" ? "note" : item.resourceType === "REVIEWER" ? "guide" : item.resourceType === "QUIZ" ? "quiz" : null;
    const file = kind && files.find(candidate => candidate.kind === kind && candidate.id === item.resourceId);
    return file ? [file] : [];
  }) ?? [];
  const notebookSubjects = collection?.kind === "NOTEBOOK" && Array.isArray(collection.subjects) ? collection.subjects as Array<{ id: string; title: string }> : [];
  const filesForSubject = (subjectId?: string) => linkedFiles.filter(file => {
    const resourceType = file.kind === "note" ? "NOTE" : file.kind === "guide" ? "REVIEWER" : "QUIZ";
    return collection?.items.find(item => item.resourceType === resourceType && item.resourceId === file.id)?.subjectId === (subjectId ?? null);
  });
  const markdown = selected?.kind === "note" ? snapshot?.notes.find(item => item.id === selected.id)?.content
    : selected?.kind === "guide" ? snapshot?.reviewers.find(item => item.id === selected.id)?.content : null;
  const quiz = selected?.kind === "quiz" ? snapshot?.quizzes.find(item => item.id === selected.id) : null;
  const diagram = selected?.kind === "diagram" ? snapshot?.diagrams.find(item => item.id === selected.id) : null;
  const currentCard = selected?.kind === "flashcards" ? snapshot?.flashcards[cardIndex] : null;
  const questions = quiz && Array.isArray(quiz.questions) ? quiz.questions as Array<Record<string, unknown>> : [];
  const parsedDiagram = diagram ? diagramDataSchema.safeParse(diagram.data) : null;
  const diagramImage = parsedDiagram?.success ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(diagramToSvg(parsedDiagram.data, snapshot?.media ?? {}))}` : null;

  function open(file: OfflineFile) { setSelection({ kind: file.kind, id: file.id }); setCardIndex(0); setShowAnswer(false); }
  function resourceName(kind: FileKind) { const Icon = icons[kind]; return <Icon className="h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />; }

  return <main className="min-h-dvh bg-paper px-4 pb-12 pt-6 text-ink sm:px-8 sm:pt-10">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div><Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm text-ink-soft"><ArrowLeft className="h-4 w-4" />Memoria</Link><h1 className="mt-3 font-display text-3xl">Your offline library</h1><p className="mt-2 text-sm text-ink-soft">{snapshot ? `${snapshot.account.name} · Last synced ${new Date(snapshot.syncedAt).toLocaleString()}` : "Files saved on this device"}</p></div>
        <span className="rounded-full border border-line px-3 py-2 text-xs text-ink-soft">{online ? "Online · sync is automatic" : "Offline copy"}</span>
      </header>
      {loading ? <p className="py-12 text-sm text-ink-soft">Opening files saved on this device…</p> : !snapshot ? <section className="max-w-xl py-12"><h2 className="font-display text-2xl">No offline copy yet</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">Sign in while you are online and leave Memoria open for its first sync. Your notes, study guides, quizzes, diagrams, books, notebooks, and flashcards will then be available here.</p><Link href="/login" className="mt-5 inline-flex min-h-11 items-center rounded-control bg-action px-4 text-sm font-medium text-action-foreground">Sign in to sync</Link></section> : <div className="grid gap-8 py-8 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
        <section aria-label="Saved files" className="min-w-0">
          <label className="flex min-h-12 items-center gap-2 rounded-control border border-line bg-surface px-3"><Search className="h-4 w-4 text-ink-faint" aria-hidden="true" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search offline files" placeholder="Find a saved file" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <p className="mb-2 mt-5 text-xs text-ink-faint">{files.length} saved {files.length === 1 ? "file" : "files"}</p>
          <nav aria-label="Saved files" className="space-y-1">{files.map(file => <button key={file.kind + file.id} type="button" onClick={() => open(file)} aria-current={selected?.id === file.id && selected.kind === file.kind ? "true" : undefined} className={'flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm ' + (selected?.id === file.id && selected.kind === file.kind ? "bg-accent-soft font-medium" : "hover:bg-surface-muted")}>{resourceName(file.kind)}<span className="min-w-0 flex-1 truncate">{file.title}<span className="mt-0.5 block text-xs font-normal text-ink-faint">{labels[file.kind]}</span></span></button>)}{!files.length && <p className="py-6 text-sm text-ink-soft">No saved files match that search.</p>}</nav>
          <div className="mt-6 border-t border-line pt-4"><p className="text-xs leading-relaxed text-ink-faint">This read-only copy stays on this device. It contains your last synced files and is visible to anyone who can unlock the device.</p></div>
        </section>
        <article className="min-w-0 rounded-card border border-line bg-surface p-5 sm:p-8">
          {!selected ? <div className="py-12 text-center"><BookOpen className="mx-auto h-7 w-7 text-ink-faint" /><h2 className="mt-4 font-display text-2xl">Pick up where you left off.</h2><p className="mt-2 text-sm text-ink-soft">Choose one of your saved files to read it offline.</p></div> : <>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{labels[selected.kind]}</p><h2 className="mt-2 break-words font-display text-3xl">{selected.title}</h2>
            {collection && <><p className="mt-3 text-sm leading-relaxed text-ink-soft">{collection.description || collection.subtitle}</p><h3 className="mb-3 mt-7 border-b border-line pb-2 text-sm font-medium">{collection.tocTitle}</h3>{linkedFiles.length ? <nav aria-label={collection.tocTitle} className="space-y-1">{notebookSubjects.map(subject => <section key={subject.id}><h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">{subject.title}</h4>{filesForSubject(subject.id).map(file => <button key={file.kind + file.id} onClick={() => open(file)} className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm hover:bg-surface-muted">{resourceName(file.kind)}{file.title}</button>)}</section>)}{filesForSubject().map(file => <button key={file.kind + file.id} onClick={() => open(file)} className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm hover:bg-surface-muted">{resourceName(file.kind)}{file.title}</button>)}</nav> : <p className="mt-3 text-sm text-ink-soft">No items from this book or notebook were included in the last sync.</p>}</>}
            {markdown && <div className="document-body mt-7 border-t border-line pt-6"><MarkdownRenderer content={markdown} resolvedAssets={snapshot?.media} /></div>}
            {quiz && <div className="mt-7 space-y-5 border-t border-line pt-6">{quiz.description && <p className="text-sm text-ink-soft">{quiz.description}</p>}{questions.length ? questions.map((question, index) => <OfflineQuizQuestion key={index} question={question} index={index} />) : <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(quiz.questions, null, 2)}</pre>}</div>}
            {diagram && <div className="mt-7 border-t border-line pt-6">{diagramImage ? <Image src={diagramImage} alt={`Diagram: ${diagram.title}`} width={900} height={560} unoptimized className="h-auto max-h-[70dvh] w-full rounded-control border border-line bg-white object-contain" /> : <p className="text-sm text-ink-soft">This diagram format cannot be previewed in this version of the offline library.</p>}<details className="mt-4"><summary className="min-h-10 cursor-pointer py-2 text-sm text-ink-soft">View diagram data</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 text-xs leading-relaxed">{JSON.stringify(diagram.data, null, 2)}</pre></details></div>}
            {selected.kind === "flashcards" && snapshot?.flashcards.length ? <section className="mt-7 border-t border-line pt-6"><p className="text-xs text-ink-faint">Card {cardIndex + 1} of {snapshot.flashcards.length}</p><button type="button" aria-label={showAnswer ? "Show flashcard question" : "Reveal flashcard answer"} onClick={() => setShowAnswer(value => !value)} className="mt-3 flex min-h-48 w-full items-center justify-center rounded-card border border-line bg-surface-muted p-6 text-center font-display text-2xl leading-relaxed">{showAnswer ? currentCard?.back : currentCard?.front}</button><div className="mt-4 flex items-center justify-between gap-3"><button type="button" disabled={cardIndex === 0} onClick={() => { setCardIndex(index => index - 1); setShowAnswer(false); }} className="min-h-11 rounded-control border border-line px-4 text-sm disabled:opacity-40">Previous card</button><button type="button" disabled={cardIndex >= snapshot.flashcards.length - 1} onClick={() => { setCardIndex(index => index + 1); setShowAnswer(false); }} className="min-h-11 rounded-control bg-action px-4 text-sm text-action-foreground disabled:opacity-40">Next card</button></div><p className="mt-4 text-xs text-ink-faint">Flashcard order and review history remain unchanged offline.</p></section> : null}
          </>}
        </article>
      </div>}
      <footer className="border-t border-line pt-4 text-xs text-ink-faint">Changes refresh automatically whenever this device is online and Memoria is open.</footer>
    </div>
  </main>;
}
