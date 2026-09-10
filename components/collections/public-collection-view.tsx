"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Pencil, LogIn } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { QuestionInput } from "@/components/quizzes/question-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, Input, Label } from "@/components/ui/input";
import { gradeQuiz } from "@/lib/quiz-grading";
import { extractFlashcardsFromMarkdown } from "@/lib/flashcards";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";
import type { PublicCollection } from "@/lib/share-collections-repo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ExportMenu } from "@/components/exports/export-menu";
import type { ExportProgressHandler } from "@/lib/export/types";

export function PublicCollectionView({ collection }: { collection: PublicCollection }) {
  const firstItemId = collection.lastReadItemId && collection.items.some((item) => item.id === collection.lastReadItemId) ? collection.lastReadItemId : collection.items[0]?.id ?? null;
  const [activeItemId, setActiveItemId] = useState<string | null>(firstItemId);
  const [readerView, setReaderView] = useState<"book" | "feedback">("book");
  const [mobilePage, setMobilePage] = useState<"contents" | "chapter">("contents");
  const [feedback, setFeedback] = useState(collection.feedback);
  const activeIndex = Math.max(0, collection.items.findIndex((item) => item.id === activeItemId));
  const activeItem = collection.items[activeIndex];
  const activeResource = activeItem?.resourceType === "NOTE" ? collection.notes.find((item) => item.id === activeItem.resourceId) : activeItem?.resourceType === "REVIEWER" ? collection.reviewers.find((item) => item.id === activeItem.resourceId) : collection.quizzes.find((item) => item.id === activeItem?.resourceId);

  function chapterTitle(item: PublicCollection["items"][number]) {
    if (item.resourceType === "NOTE") return collection.notes.find((entry) => entry.id === item.resourceId)?.title ?? "Unavailable Memory";
    if (item.resourceType === "REVIEWER") return collection.reviewers.find((entry) => entry.id === item.resourceId)?.title ?? "Unavailable reviewer";
    return collection.quizzes.find((entry) => entry.id === item.resourceId)?.title ?? "Unavailable quiz";
  }

  function openChapter(itemId: string) {
    setActiveItemId(itemId);
    setMobilePage("chapter");
    if (collection.viewerUserId) void fetch(`/api/collections/${collection.id}/progress`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lastItemId: itemId }) });
  }

  async function exportBook(format: string, onProgress?: ExportProgressHandler) {
    if (format === "json") { window.location.href = `/api/collections/public/${collection.slug}/export?format=json`; return; }
    const response = await fetch(`/api/collections/public/${collection.slug}/export`);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Couldn't export this Book.");
    if (format === "pdf") { const { exportBookToPdf } = await import("@/lib/pdf-export"); await exportBookToPdf(data.title, data.markdown, { subtitle: data.subtitle, description: data.description, author: data.ownerName }, onProgress); }
    if (format === "docx") { const { exportBookToWord } = await import("@/lib/word-export"); await exportBookToWord(data.title, data.markdown, { subtitle: data.subtitle, description: data.description, author: data.ownerName }, onProgress); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={collection.viewerUserId ? "/shared" : "/"} className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">
              <ArrowLeft className="h-4 w-4" /><BookMarked className="h-4 w-4 text-accent-dark" /> Back to Memoria
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {collection.canExport && <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "json", label: "Memoria JSON" }]} onExport={exportBook} />}
              <Badge tone={collection.viewerPermission === "VIEW" ? "neutral" : "accent"}>{collection.viewerPermission === "OWNER" ? "Owner" : collection.viewerPermission === "EDIT" ? "Editor" : "Viewer"}</Badge>
              {collection.viewerPermission === "EDIT" || collection.viewerPermission === "OWNER" ? collection.viewerUserId ? <Link href={`/books/${collection.id}`} className="inline-flex h-9 items-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-ink hover:bg-surface-muted"><Pencil className="h-4 w-4" />Edit</Link> : <Link href={`/login?callbackUrl=${encodeURIComponent(`/c/${collection.slug}`)}`} className="inline-flex h-9 items-center gap-2 rounded-control border border-line px-3 text-sm font-medium text-ink hover:bg-surface-muted"><LogIn className="h-4 w-4" />Sign in to edit</Link> : null}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
        <nav aria-label="Book sections" className="mb-5 flex w-full gap-1 rounded-card border border-line bg-surface-muted p-1 sm:w-fit">
          <button type="button" aria-current={readerView === "book" ? "page" : undefined} onClick={() => setReaderView("book")} className={cn("inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors sm:flex-none", readerView === "book" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><BookMarked className="h-4 w-4" />Read Book</button>
          <button type="button" aria-current={readerView === "feedback" ? "page" : undefined} onClick={() => setReaderView("feedback")} className={cn("inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors sm:flex-none", readerView === "feedback" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink")}><MessageSquare className="h-4 w-4" />Discussion</button>
        </nav>

        {readerView === "book" && <section className="relative overflow-hidden rounded-[1.35rem] border border-line-strong bg-action p-2 shadow-card-hover sm:p-3">
          <div className="pointer-events-none absolute inset-y-3 left-[35%] z-10 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/15 to-transparent lg:block" aria-hidden="true" />
          <div className="grid min-h-[42rem] overflow-hidden rounded-[0.9rem] lg:grid-cols-[35%_65%]">
            <aside className={cn("min-w-0 bg-surface-muted px-5 py-8 text-ink sm:px-8 sm:py-10 lg:block lg:border-r lg:border-line", mobilePage === "contents" ? "block" : "hidden")}>
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-accent-dark"><BookMarked className="h-4 w-4" />Memoria Book</div>
              <h1 className="mt-8 font-display text-3xl leading-tight">{collection.title}</h1>{collection.subtitle && <p className="mt-2 font-display text-lg italic text-ink-soft">{collection.subtitle}</p>}<p className="mt-3 text-xs text-ink-faint">By {collection.ownerName}</p>
              {collection.description && <p className="mt-5 text-sm leading-6 text-ink-soft">{collection.description}</p>}
              <div className="mt-8 border-t border-line pt-6"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Table of contents</p><h2 className="mt-1 font-display text-2xl">{collection.tocTitle}</h2>
                {collection.items.length === 0 ? <p className="mt-5 text-sm text-ink-faint">This Book is waiting for its first Memory.</p> : <ol className="mt-5 space-y-1">{collection.items.map((item, index) => <li key={item.id}><button type="button" aria-current={item.id === activeItemId ? "page" : undefined} onClick={() => openChapter(item.id)} className={cn("flex w-full min-w-0 items-center gap-3 border-b border-line py-3 text-left text-ink-soft transition-colors hover:text-accent-dark", item.id === activeItemId && "text-accent-dark")}><span className="w-6 shrink-0 font-display text-base">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{chapterTitle(item)}</span>{item.id === collection.lastReadItemId && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-accent-dark">Continue</span>}</button></li>)}</ol>}
              </div>
            </aside>

            <article className={cn("min-w-0 bg-surface-raised px-5 py-8 text-ink sm:px-10 sm:py-12 lg:block lg:px-14", mobilePage === "chapter" ? "block" : "hidden")}>
              <button type="button" onClick={() => setMobilePage("contents")} className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink lg:hidden"><ChevronLeft className="h-4 w-4" />Contents</button>
              {!activeItem || !activeResource ? <div className="flex min-h-[32rem] items-center justify-center text-center"><div><BookMarked className="mx-auto h-8 w-8 text-accent-dark" /><p className="mt-4 font-display text-2xl">The pages are waiting.</p><p className="mt-2 text-sm text-ink-faint">The owner hasn&apos;t added a chapter yet.</p></div></div> : <>
                <div className="flex items-center justify-between gap-4 border-b border-line pb-4"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink-faint">Chapter {activeIndex + 1} of {collection.items.length}</p><span className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint">{activeItem.resourceType === "NOTE" ? "Memory" : activeItem.resourceType === "REVIEWER" ? "Reviewer" : "Quiz"}</span></div>
                <h2 className="mt-7 font-display text-3xl leading-tight sm:text-4xl">{activeResource.title}</h2>{activeResource.description && <p className="mt-3 text-sm italic leading-6 text-ink-soft">{activeResource.description}</p>}
                <div className="mt-8 min-w-0">{activeItem.resourceType === "QUIZ" ? <PublicQuiz title={activeResource.title} description={null} questions={(activeResource as PublicCollection["quizzes"][number]).questions as QuizQuestion[]} /> : <><MarkdownRenderer content={(activeResource as PublicCollection["notes"][number]).content} />{activeItem.resourceType === "REVIEWER" && extractFlashcardsFromMarkdown((activeResource as PublicCollection["reviewers"][number]).content).length > 0 && <div className="mt-10 border-t border-line pt-8"><h3 className="mb-4 font-display text-2xl">Review cards</h3><PublicFlashcardDeck cards={extractFlashcardsFromMarkdown((activeResource as PublicCollection["reviewers"][number]).content)} /></div>}</>}</div>
                <div className="mt-12 flex items-center justify-between border-t border-line pt-5"><button type="button" disabled={activeIndex === 0} onClick={() => openChapter(collection.items[activeIndex - 1].id)} className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-accent-dark disabled:opacity-25"><ChevronLeft className="h-4 w-4" />Previous</button><span className="font-display text-sm text-ink-faint">{activeIndex + 1}</span><button type="button" disabled={activeIndex === collection.items.length - 1} onClick={() => openChapter(collection.items[activeIndex + 1].id)} className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-accent-dark disabled:opacity-25">Next<ChevronRight className="h-4 w-4" /></button></div>
              </>}
            </article>
          </div>
        </section>}

        {readerView === "feedback" && <FeedbackSection slug={collection.slug} viewerUserId={collection.viewerUserId} feedback={feedback} onSubmitted={(f) => setFeedback((prev) => [...prev, f])} onChanged={setFeedback} />}
      </main>
    </div>
  );
}

function PublicQuiz({ title, description, questions }: { title: string; description: string | null; questions: QuizQuestion[] }) {
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
          <p className="mt-1 text-xs text-ink-faint">{questions.length} questions · answers aren&apos;t saved anywhere</p>
        </div>
        {!taking && (
          <Button
            onClick={() => {
              setTaking(true);
              setResult(null);
              setAnswers({});
            }}
          >
            Try it
          </Button>
        )}
      </div>

      {taking && !result && (
        <div className="mt-5 space-y-6">
          {questions.map((q, i) => (
            <div key={q.id}>
              <p className="mb-2 text-sm font-medium text-ink">
                {i + 1}. {q.question}
              </p>
              <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTaking(false)}>
              Cancel
            </Button>
            <Button onClick={() => setResult({ score: gradeQuiz(questions, answers).score, total: questions.length })}>
              Submit
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-lg border border-line bg-ink/[0.02] p-5 text-center">
          <p className="font-display text-2xl text-ink">
            {result.score} / {result.total}
          </p>
          <p className="mt-1 text-sm text-ink-soft">Nice work — this attempt isn&apos;t saved anywhere.</p>
          <Button variant="outline" className="mt-3" onClick={() => setTaking(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

function PublicFlashcardDeck({ cards }: { cards: { front: string; back: string }[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 text-xs text-ink-faint">
        Card {index + 1} of {cards.length}
      </p>
      <div
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          "card flex min-h-[180px] cursor-pointer items-center justify-center p-8 text-center transition-colors",
          flipped ? "bg-accent-soft/40" : "bg-surface"
        )}
      >
        <p className="font-display text-lg text-ink">{flipped ? card.back : card.front}</p>
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">Tap the card to flip it</p>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={index === 0}
          className="text-ink-faint disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex(0);
          }}
          className="text-ink-faint"
          title="Restart"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => Math.min(cards.length - 1, i + 1));
          }}
          disabled={index === cards.length - 1}
          className="text-ink-faint disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function FeedbackSection({
  slug,
  viewerUserId,
  feedback,
  onSubmitted,
  onChanged,
}: {
  slug: string;
  viewerUserId: string | null;
  feedback: PublicCollection["feedback"];
  onSubmitted: (f: PublicCollection["feedback"][number]) => void;
  onChanged: React.Dispatch<React.SetStateAction<PublicCollection["feedback"]>>;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<{ target: string; message: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function submit(content: string, parentId?: string) {
    const target = parentId ?? "root";
    if (!content.trim()) return;
    setSending(target);
    setError(null);
    try {
      const res = await fetch(`/api/collections/public/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name.trim() || undefined, message: content.trim(), parentId }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError({ target, message: "The server sent back something unexpected. Please try again." });
      } else if (!res.ok) {
        setError({ target, message: data.error ?? "Couldn't send feedback." });
      } else {
        onSubmitted({ id: data.feedback.id, authorName: data.feedback.authorName ?? (name.trim() || null), authorUserId: data.feedback.authorUserId ?? viewerUserId, message: content.trim(), createdAt: new Date(), updatedAt: new Date(), parentId: parentId ?? null });
        if (parentId) {
          setReplyMessage("");
          setReplyTo(null);
        } else {
          setMessage("");
          setSent(true);
          setTimeout(() => setSent(false), 2000);
        }
      }
    } catch {
      setError({ target, message: "We couldn't reach the server. Check your connection and try again." });
    }
    setSending(null);
  }

  async function editComment(id: string, current: string) {
    const next = window.prompt("Edit your comment", current)?.trim();
    if (!next || next === current) return;
    setEditingId(id);
    const response = await fetch(`/api/feedback/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: next }) });
    if (response.ok) onChanged((rows) => rows.map((row) => row.id === id ? { ...row, message: next, updatedAt: new Date() } : row));
    setEditingId(null);
  }

  async function deleteComment(id: string) {
    if (!window.confirm("Delete this comment and its replies?")) return;
    const response = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    if (response.ok) onChanged((rows) => rows.filter((row) => row.id !== id && row.parentId !== id));
  }

  async function reportComment(id: string) {
    const reason = window.prompt("Why are you reporting this comment? (optional)") ?? undefined;
    const response = await fetch(`/api/feedback/${id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (response.ok) window.alert("Report submitted. Thank you.");
  }

  return (
    <div className="mt-12 border-t border-line pt-8">
      <h2 className="flex items-center gap-1.5 font-display text-lg text-ink">
        <MessageSquare className="h-4 w-4" /> Feedback
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Start a discussion or reply to another person&apos;s feedback.</p>

      <div className="card mt-4 p-5">
        {!viewerUserId && <><Label htmlFor="feedback-name">Name (optional)</Label><Input id="feedback-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" className="mt-1.5" /></>}
        <div className="mt-3">
          <Label htmlFor="feedback-message">Your feedback</Label>
          <Textarea id="feedback-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thoughts, corrections, questions…" className="mt-1.5" />
        </div>
        {error?.target === "root" && <p className="mt-2 text-sm text-danger">{error.message}</p>}
        <div className="mt-3 flex items-center justify-end gap-2">
          {sent && <span className="text-sm text-success">Sent, thank you!</span>}
          <Button onClick={() => void submit(message)} loading={sending === "root"} disabled={!message.trim()}>
            Send feedback
          </Button>
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="mt-5 space-y-2">
          {feedback.map((f) => (
            <div id={`feedback-${f.id}`} key={f.id} className={cn("rounded-lg border border-line bg-surface p-3.5", f.parentId && "ml-6 border-l-2 border-l-accent")}>
              <p className="text-sm text-ink">{f.message}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {f.authorName || "Anonymous"} · {formatRelativeTime(f.createdAt)}{f.updatedAt.getTime() - f.createdAt.getTime() > 1000 ? " · edited" : ""}
              </p>
              <div className="mt-2 flex gap-3 text-xs font-medium">
                <button
                  type="button"
                  aria-expanded={replyTo === f.id}
                  aria-controls={`reply-form-${f.id}`}
                  onClick={() => {
                    setError(null);
                    setReplyMessage("");
                    setReplyTo((current) => current === f.id ? null : f.id);
                  }}
                  className="text-accent-dark hover:underline"
                >
                  Reply
                </button>
                {viewerUserId === f.authorUserId ? <><button disabled={editingId === f.id} onClick={() => editComment(f.id, f.message)} className="text-ink-soft hover:underline">Edit</button><button onClick={() => deleteComment(f.id)} className="text-danger hover:underline">Delete</button></> : viewerUserId && <button onClick={() => reportComment(f.id)} className="text-ink-faint hover:text-danger">Report</button>}
              </div>
              {replyTo === f.id && (
                <div id={`reply-form-${f.id}`} className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/15 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`reply-message-${f.id}`}>Reply to {f.authorName || "Anonymous"}</Label>
                    <button type="button" onClick={() => { setReplyTo(null); setReplyMessage(""); setError(null); }} className="text-xs text-ink-faint hover:text-ink">Cancel</button>
                  </div>
                  {!viewerUserId && <Input id={`reply-name-${f.id}`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name (optional)" className="mt-2" />}
                  <Textarea id={`reply-message-${f.id}`} autoFocus rows={3} value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} placeholder="Write your reply…" className="mt-2" />
                  {error?.target === f.id && <p className="mt-2 text-sm text-danger">{error.message}</p>}
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={() => void submit(replyMessage, f.id)} loading={sending === f.id} disabled={!replyMessage.trim()}>Send reply</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-ink-faint">
        Made with <Badge tone="accent">Memoria</Badge>
      </p>
    </div>
  );
}
