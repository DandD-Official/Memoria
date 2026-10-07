"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, FileText, Layers, ListChecks, Search, Wifi, WifiOff, Workflow } from "lucide-react";
import { MemoryMark } from "@/components/layout/brand";
import { primaryNavigation } from "@/components/layout/navigation";
import { MmdRenderer as MarkdownRenderer } from "@/components/mmd/renderer";
import { diagramToSvg } from "@/lib/diagrams/svg";
import { diagramDataSchema } from "@/lib/diagrams/schema";
import { readOfflineSnapshot, saveOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-store";

type FileKind = "note" | "guide" | "quiz" | "diagram" | "book" | "notebook" | "flashcards";
type WorkspaceSection = "desk" | "library" | "notes" | "guides" | "quizzes" | "diagrams" | "together" | "books" | "notebooks" | "practice";
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
  const [section, setSection] = useState<WorkspaceSection>("desk");
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

  useEffect(() => {
    const path = new URLSearchParams(window.location.search).get("path");
    if (!path) return;
    const [pathname, search] = path.split("?");
    const [root, id] = pathname.split("/").filter(Boolean);
    const sectionByPath: Record<string, WorkspaceSection> = { dashboard: "desk", library: "library", notes: "notes", reviewers: "guides", quizzes: "quizzes", diagrams: "diagrams", books: "books", notebooks: "notebooks", study: "practice" };
    setSection(sectionByPath[root] ?? "desk");
    if (root === "notes" && id) setSelection({ kind: "note", id });
    if (root === "reviewers" && id) setSelection({ kind: "guide", id });
    if (root === "quizzes" && id) setSelection({ kind: "quiz", id });
    if (root === "books" && id) setSelection({ kind: "book", id });
    if (root === "notebooks" && id) setSelection({ kind: "notebook", id });
    if (root === "diagrams") { const diagramId = new URLSearchParams(search ?? "").get("open"); if (diagramId) setSelection({ kind: "diagram", id: diagramId }); }
    if (root === "study") setSelection({ kind: "flashcards", id: "offline-flashcards" });
  }, []);

  const selected = selection ? files.find(file => file.id === selection.id && file.kind === selection.kind) : null;
  const sectionFiles = files.filter(file => section === "library" ? file.kind !== "flashcards" : section === "notes" ? file.kind === "note" : section === "guides" ? file.kind === "guide" : section === "quizzes" ? file.kind === "quiz" : section === "diagrams" ? file.kind === "diagram" : section === "books" ? file.kind === "book" : section === "notebooks" ? file.kind === "notebook" : section === "practice" ? file.kind === "flashcards" || file.kind === "quiz" : section === "together" ? file.kind === "book" || file.kind === "notebook" : true);
  const recentFiles = [...files].filter(file => file.kind !== "flashcards").slice(0, 5);
  const sectionTitle: Record<WorkspaceSection, string> = { desk: "Your personal study desk", library: "Everything in your library", notes: "Source notes", guides: "Study guides", quizzes: "Quizzes & exams", diagrams: "Diagrams", together: "Books and notebooks", books: "Books", notebooks: "Notebooks", practice: "Practice" };
  const dashboardNext = recentFiles[0] ?? sectionFiles[0];


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

  function open(file: OfflineFile) {
    setSelection({ kind: file.kind, id: file.id });
    setCardIndex(0);
    setShowAnswer(false);
    const path = file.kind === "note" ? "/notes/" + file.id
      : file.kind === "guide" ? "/reviewers/" + file.id
        : file.kind === "quiz" ? "/quizzes/" + file.id
          : file.kind === "diagram" ? "/diagrams?open=" + file.id
            : file.kind === "book" ? "/books/" + file.id
              : file.kind === "notebook" ? "/notebooks/" + file.id
                : "/study/flashcards";
    window.history.replaceState(null, "", "/offline?path=" + encodeURIComponent(path));
  }
  function navigateSection(next: WorkspaceSection) {
    setSection(next);
    setSelection(null);
    setQuery("");
    window.history.replaceState(null, "", "/offline");
  }
  function resourceName(kind: FileKind) { const Icon = icons[kind]; return <Icon className="h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />; }

  const contextSections: Array<{ id: WorkspaceSection; label: string }> = section === "library"
    ? [{ id: "library", label: "Everything" }, { id: "notes", label: "Source notes" }, { id: "guides", label: "Study guides" }, { id: "diagrams", label: "Diagrams" }, { id: "quizzes", label: "Quizzes & exams" }]
    : section === "together" || section === "books" || section === "notebooks"
      ? [{ id: "books", label: "Books" }, { id: "notebooks", label: "Notebooks" }]
      : section === "practice"
        ? [{ id: "practice", label: "Flashcards" }, { id: "quizzes", label: "Quizzes & exams" }]
        : [];
  const dueCards = snapshot?.flashcards.filter(card => { const progress = snapshot.progress.find(item => item.flashcardId === card.id); return !progress || Date.parse(progress.dueAt) <= Date.now(); }).length ?? 0;

  return <div className="workspace min-h-dvh text-ink">
    <a href="#offline-main" className="skip-link">Skip to content</a>
    <header className="workspace-header sticky top-0 z-40">
      <div className="mx-auto flex min-h-[76px] max-w-[1400px] items-center gap-3 px-page lg:gap-8">
        <button type="button" onClick={() => navigateSection("desk")} aria-label="Memoria desk" className="inline-flex items-center gap-2 text-ink"><MemoryMark className="h-9 w-9 shrink-0" /><span className="hidden font-display text-[1.65rem] tracking-[-0.055em] sm:inline">memoria<span className="text-accent-dark">.</span></span></button>
        <nav aria-label="Main navigation" className="hidden self-stretch lg:flex">
          {primaryNavigation.map(item => {
            const target: WorkspaceSection = item.href === "/dashboard" ? "desk" : item.href === "/library" ? "library" : item.href === "/study" ? "practice" : "together";
            return <button key={item.href} type="button" aria-current={section === target || (target === "library" && ["notes", "guides", "quizzes", "diagrams"].includes(section)) || (target === "together" && ["books", "notebooks"].includes(section)) ? "page" : undefined} onClick={() => navigateSection(target)} className={"top-nav-link " + (section === target || (target === "library" && ["notes", "guides", "quizzes", "diagrams"].includes(section)) || (target === "together" && ["books", "notebooks"].includes(section)) ? "is-active" : "")}>{item.label}</button>;
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <span role="status" aria-live="polite" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 text-xs font-semibold text-ink">
            {online ? <Wifi className="h-4 w-4 shrink-0 text-study" aria-hidden="true" /> : <WifiOff className="h-4 w-4 shrink-0 text-accent-dark" aria-hidden="true" />}
            <span>{online ? "Saved workspace · online" : "Offline mode"}</span>
          </span>
        </div>
      </div>
    </header>

    {contextSections.length > 0 && <div className="context-index">
      <nav aria-label="Workspace section" className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-page">
        {contextSections.map(item => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => navigateSection(item.id)} className={"inline-flex min-h-14 shrink-0 items-center rounded-control px-3 text-xs " + (section === item.id ? "bg-accent-soft font-semibold text-ink" : "text-ink-soft hover:bg-surface-muted")}>{item.label}</button>)}
      </nav>
    </div>}

    <main id="offline-main" tabIndex={-1} className="workspace-content mx-auto max-w-[1400px] px-page pb-28 pt-8 sm:pt-10 lg:pb-16">
      {loading ? <p className="py-12 text-sm text-ink-soft">Opening your saved workspace…</p> : !snapshot ? <section className="max-w-xl py-12"><p className="eyebrow">Offline mode</p><h1 className="mt-3 font-display text-3xl">No saved workspace on this device</h1><p className="mt-3 text-sm leading-relaxed text-ink-soft">Connect to the internet and open Memoria while signed in to sync your account. Your latest saved files will then be available here.</p></section> : section === "desk" ? <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-16">
        <div className="min-w-0">
          <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Your personal study desk · offline mode</p><h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">Room to think{snapshot.account.name ? ", " + snapshot.account.name.split(" ")[0] : ""}.</h1></div><span className="text-xs text-ink-faint">Last synced {new Date(snapshot.syncedAt).toLocaleString()}</span></header>
          <section className="relative mt-8 border-y border-line bg-surface px-5 py-8 sm:px-8 sm:py-10" aria-labelledby="offline-next-title">
            <div className="flex items-center justify-between gap-3"><p className="index-label">01 / A good next step</p><span className="flex h-9 w-9 items-center justify-center rounded-full border border-line"><ArrowRight className="h-4 w-4 text-accent-dark" /></span></div>
            <p className="mt-7 text-xs font-medium text-accent-dark">{dueCards > 0 ? "A little recall goes a long way" : "Pick up a thread"}</p>
            <h2 id="offline-next-title" className="mt-3 max-w-xl break-words font-display text-3xl leading-tight tracking-tight sm:text-4xl">{dueCards > 0 ? dueCards + " cards to revisit." : dashboardNext?.title ?? "Your saved study desk."}</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">{dueCards > 0 ? "Your saved flashcards are ready. Practice works offline; your review history will sync when you reconnect." : "Continue from the material you last opened or updated. Everything here reflects your latest sync."}</p>
            <button type="button" onClick={() => dueCards > 0 && snapshot.flashcards.length ? (navigateSection("practice"), setSelection({ kind: "flashcards", id: "offline-flashcards" })) : dashboardNext && open(dashboardNext)} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-control bg-action px-4 text-sm font-medium text-action-foreground">{dueCards > 0 && snapshot.flashcards.length ? "Begin a review" : "Continue learning"}<ArrowRight className="h-4 w-4" /></button>
          </section>
          <section className="mt-10" aria-labelledby="offline-recent-title"><div className="journal-rule"><h2 id="offline-recent-title" className="section-heading">On your desk</h2><button type="button" onClick={() => navigateSection("library")} className="journal-link">Open library<ArrowRight className="h-4 w-4" /></button></div>
            {recentFiles.length ? <div className="divide-y divide-line">{recentFiles.map(file => <button key={file.kind + file.id} type="button" onClick={() => open(file)} className="flex min-h-14 w-full items-center gap-3 py-3 text-left hover:text-accent-dark">{resourceName(file.kind)}<span className="min-w-0 flex-1 truncate text-sm font-medium">{file.title}<span className="mt-1 block text-xs font-normal text-ink-faint">{labels[file.kind]}</span></span><ArrowRight className="h-4 w-4 text-ink-faint" /></button>)}</div> : <p className="py-8 text-sm text-ink-soft">Your synced study materials will show up here.</p>}
          </section>
        </div>
        <aside className="space-y-9">
          <section><p className="index-label">02 / Keep it in memory</p><div className="mt-5 flex items-center gap-4"><BookOpen className="h-5 w-5 text-accent-dark" /><p className="font-display text-2xl">{dueCards > 0 ? dueCards + " cards to revisit" : "A little breathing room."}</p></div><p className="mt-3 text-sm leading-relaxed text-ink-soft">{dueCards > 0 ? "Return to your saved flashcards. Your offline practice will not change synced progress." : "No saved cards are due right now."}</p><button type="button" onClick={() => { navigateSection("practice"); if (snapshot.flashcards.length) setSelection({ kind: "flashcards", id: "offline-flashcards" }); }} className="journal-link mt-3">Find your practice<ArrowRight className="h-4 w-4" /></button></section>
          <section className="border-t border-line pt-6"><p className="index-label">Make something of it</p><p className="mt-3 text-sm leading-relaxed text-ink-soft">Your notes and study material are available to read and review here. Changes and new material are unavailable until Memoria reconnects.</p><button type="button" onClick={() => navigateSection("library")} className="journal-link mt-3">Browse saved material<ArrowRight className="h-4 w-4" /></button></section>
        </aside>
      </div> : <div className="grid gap-8 py-4 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
        <section aria-label="Saved files" className="min-w-0">
          <label className="flex min-h-12 items-center gap-2 rounded-control border border-line bg-surface px-3"><Search className="h-4 w-4 text-ink-faint" aria-hidden="true" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search saved files" placeholder="Find a saved file" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <p className="mb-2 mt-5 text-xs text-ink-faint">{sectionFiles.length} saved {sectionFiles.length === 1 ? "item" : "items"}</p>
          <nav aria-label={sectionTitle[section]} className="space-y-1">{sectionFiles.map(file => <button key={file.kind + file.id} type="button" onClick={() => open(file)} aria-current={selected?.id === file.id && selected.kind === file.kind ? "true" : undefined} className={"flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm " + (selected?.id === file.id && selected.kind === file.kind ? "bg-accent-soft font-medium" : "hover:bg-surface-muted")}>{resourceName(file.kind)}<span className="min-w-0 flex-1 truncate">{file.title}<span className="mt-0.5 block text-xs font-normal text-ink-faint">{labels[file.kind]}</span></span></button>)}{!sectionFiles.length && <p className="py-6 text-sm text-ink-soft">No saved items here yet.</p>}</nav>
          <div className="mt-6 border-t border-line pt-4"><p className="text-xs leading-relaxed text-ink-faint">This is the last synced copy. Browsing is read-only while offline, and your online version stays unchanged.</p></div>
        </section>
        <article className="min-w-0 rounded-card border border-line bg-surface p-5 sm:p-8">
          {!selected ? <div className="py-12 text-center"><BookOpen className="mx-auto h-7 w-7 text-ink-faint" /><h2 className="mt-4 font-display text-2xl">{sectionTitle[section]}</h2><p className="mt-2 text-sm text-ink-soft">Choose saved material to continue where you left off.</p></div> : <>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{labels[selected.kind]}</p><h2 className="mt-2 break-words font-display text-3xl">{selected.title}</h2>
            {collection && <><p className="mt-3 text-sm leading-relaxed text-ink-soft">{collection.description || collection.subtitle}</p><h3 className="mb-3 mt-7 border-b border-line pb-2 text-sm font-medium">{collection.tocTitle}</h3>{linkedFiles.length ? <nav aria-label={collection.tocTitle} className="space-y-1">{notebookSubjects.map(subject => <section key={subject.id}><h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">{subject.title}</h4>{filesForSubject(subject.id).map(file => <button key={file.kind + file.id} onClick={() => open(file)} className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm hover:bg-surface-muted">{resourceName(file.kind)}{file.title}</button>)}</section>)}{filesForSubject().map(file => <button key={file.kind + file.id} onClick={() => open(file)} className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-sm hover:bg-surface-muted">{resourceName(file.kind)}{file.title}</button>)}</nav> : <p className="mt-3 text-sm text-ink-soft">No items from this book or notebook were included in the last sync.</p>}</>}
            {markdown && <div className="document-body mt-7 border-t border-line pt-6"><MarkdownRenderer content={markdown} resolvedAssets={snapshot.media} /></div>}
            {quiz && <div className="mt-7 space-y-5 border-t border-line pt-6">{quiz.description && <p className="text-sm text-ink-soft">{quiz.description}</p>}{questions.length ? questions.map((question, index) => <OfflineQuizQuestion key={index} question={question} index={index} />) : <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(quiz.questions, null, 2)}</pre>}</div>}
            {diagram && <div className="mt-7 border-t border-line pt-6">{diagramImage ? <Image src={diagramImage} alt={"Diagram: " + diagram.title} width={900} height={560} unoptimized className="h-auto max-h-[70dvh] w-full rounded-control border border-line bg-white object-contain" /> : <p className="text-sm text-ink-soft">This diagram format cannot be previewed in this version of the offline library.</p>}<details className="mt-4"><summary className="min-h-10 cursor-pointer py-2 text-sm text-ink-soft">View diagram data</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 text-xs leading-relaxed">{JSON.stringify(diagram.data, null, 2)}</pre></details></div>}
            {selected.kind === "flashcards" && snapshot.flashcards.length ? <section className="mt-7 border-t border-line pt-6"><p className="text-xs text-ink-faint">Card {cardIndex + 1} of {snapshot.flashcards.length}</p><button type="button" aria-label={showAnswer ? "Show flashcard question" : "Reveal flashcard answer"} onClick={() => setShowAnswer(value => !value)} className="mt-3 flex min-h-48 w-full items-center justify-center rounded-card border border-line bg-surface-muted p-6 text-center font-display text-2xl leading-relaxed">{showAnswer ? currentCard?.back : currentCard?.front}</button><div className="mt-4 flex items-center justify-between gap-3"><button type="button" disabled={cardIndex === 0} onClick={() => { setCardIndex(index => index - 1); setShowAnswer(false); }} className="min-h-11 rounded-control border border-line px-4 text-sm disabled:opacity-40">Previous card</button><button type="button" disabled={cardIndex >= snapshot.flashcards.length - 1} onClick={() => { setCardIndex(index => index + 1); setShowAnswer(false); }} className="min-h-11 rounded-control bg-action px-4 text-sm text-action-foreground disabled:opacity-40">Next card</button></div><p className="mt-4 text-xs text-ink-faint">Flashcard order and review history remain unchanged offline.</p></section> : null}
          </>}
        </article>
      </div>}
      <footer className="mt-10 border-t border-line pt-4 text-xs text-ink-faint">This device shows the latest synced version of your Memoria workspace. It updates automatically when you reconnect.</footer>
    </main>
    <nav aria-label="Mobile navigation" className="mobile-dock lg:hidden">{primaryNavigation.map(item => { const target: WorkspaceSection = item.href === "/dashboard" ? "desk" : item.href === "/library" ? "library" : item.href === "/study" ? "practice" : "together"; const Icon = item.icon; return <button key={item.href} type="button" onClick={() => navigateSection(target)} aria-current={section === target || (target === "library" && ["notes", "guides", "quizzes", "diagrams"].includes(section)) || (target === "together" && ["books", "notebooks"].includes(section)) ? "page" : undefined} className={"flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] " + (section === target ? "font-semibold text-action" : "text-ink-soft")}><Icon className="h-5 w-5" />{item.label}</button>; })}</nav>
  </div>;
}
