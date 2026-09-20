"use client";

import { savedMmdMessage } from "@/lib/mmd/diagnostics";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Pencil, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DocumentReader, type RelatedMaterial } from "@/components/library/document-reader";
import { MarkdownEditor } from "@/components/markdown/editor";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { DeleteReviewerButton } from "@/components/reviewers/delete-reviewer-button";
import { formatDate } from "@/lib/utils";
import { ResourceDetailActions, ResourceFavoriteButton, ResourceUtilityActions } from "@/components/library/resource-actions";
import { TagEditor } from "@/components/library/tag-editor";
import { RevisionHistory } from "@/components/library/revision-history";
import { ExportMenu } from "@/components/exports/export-menu";
import type { ExportProgressHandler } from "@/lib/export/types";

interface ReviewerDetailProps {
  reviewer: {
    id: string;
    title: string;
    description: string | null;
    style: string;
    content: string;
    updatedAt: string;
    noteCount: number;
    archived: boolean;
    favorite: boolean;
  };
  isOwner: boolean;
  canEdit: boolean;
  related?: RelatedMaterial[];
  autoSave: boolean;
}

export function ReviewerDetail({ reviewer, isOwner, canEdit, autoSave, related }: ReviewerDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reviewer.title);
  const [content, setContent] = useState(reviewer.content);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const lastSaved = useRef(`${reviewer.title}\u0000${reviewer.content}`);

  useEffect(() => {
    if (!editing || !autoSave || !canEdit) return;
    const signature = `${title}\u0000${content}`;
    if (signature === lastSaved.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const response = await fetch(`/api/reviewers/${reviewer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Memora-Autosave": "1" }, body: JSON.stringify({ title, content }) });
      setSaving(false);
      if (response.ok) { lastSaved.current = signature; setSaveMessage(savedMmdMessage(content)); }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoSave, content, editing, canEdit, reviewer.id, title]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/reviewers/${reviewer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaveMessage(savedMmdMessage(content));
      lastSaved.current = `${title}\u0000${content}`;
      setEditing(false);
    }
  }

  async function handleExport(format: string, onProgress?: ExportProgressHandler) {
    if (format === "pdf") { const { exportMarkdownToPdf } = await import("@/lib/pdf-export"); await exportMarkdownToPdf(title, content, onProgress); return; }
    if (format === "docx") { const { exportMarkdownToWord } = await import("@/lib/word-export"); await exportMarkdownToWord(title, content, onProgress); return; }
    window.location.href = `/api/reviewers/export?id=${reviewer.id}&format=${format}`;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/reviewers" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to reviewers
      </Link>

      {saveMessage && <p role="status" className="mb-3 text-sm text-ink-soft">{saveMessage}</p>}
      <div className="document-heading">
        <div className="flex flex-col gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{reviewer.style}</Badge>{!isOwner && <Badge tone="accent"><Users className="me-1 h-3.5 w-3.5" />Shared guide</Badge>}</div>
            {!editing && <h1 className="mt-4 max-w-3xl break-words font-display text-3xl leading-tight tracking-tight text-ink sm:text-5xl">{title}</h1>}
            {!editing && reviewer.description && <p className="mt-1 text-ink-soft">{reviewer.description}</p>}
            {!editing && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint"><span>Last updated {formatDate(reviewer.updatedAt)}</span>{reviewer.noteCount > 0 && <><span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden="true" /><span>Built from {reviewer.noteCount} {reviewer.noteCount === 1 ? "note" : "notes"}</span></>}</div>}
          </div>
          <ResourceDetailActions
            edit={canEdit && !editing ? <Button variant="primary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button> : undefined}
            study={<div className="space-y-2"><Link href={`/study/flashcards/${reviewer.id}`} className="flex min-h-10 w-full items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-accent hover:bg-accent-soft"><BookOpen className="h-3.5 w-3.5 text-accent-dark" /> Study flashcards</Link><Link href={`/quizzes?fromReviewer=${reviewer.id}`} className="flex min-h-10 w-full items-center gap-2 rounded-control bg-accent px-3 text-sm font-medium text-ink hover:bg-accent-dark hover:text-white"><Sparkles className="h-3.5 w-3.5" /> Create quiz</Link></div>}
            favorite={isOwner ? <ResourceFavoriteButton resourceType="REVIEWER" resourceId={reviewer.id} favorite={reviewer.favorite} /> : <span />}
            share={isOwner ? <ShareDialog resourceType="REVIEWER" resourceId={reviewer.id} /> : undefined}
            exportAction={<ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "md", label: "Markdown" }, { value: "json", label: "Memoria JSON" }]} onExport={handleExport} />}
            tools={<>

              {isOwner && <ResourceUtilityActions resourceType="REVIEWER" resourceId={reviewer.id} archived={reviewer.archived} />}
              {isOwner && <RevisionHistory resourceType="REVIEWER" resourceId={reviewer.id} />}
              {isOwner && <DeleteReviewerButton reviewerId={reviewer.id} />}
            </>}
          />
        </div>
      </div>

      {editing ? (
        <>
          <Label htmlFor="reviewer-title">Title</Label>
          <Input id="reviewer-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 font-display text-lg" />
          <Label>Content (Markdown)</Label>
          <MarkdownEditor value={content} onChange={setContent} />
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save changes</Button>
          </div>
        </>
      ) : (
        <>
          {isOwner && <TagEditor resourceType="REVIEWER" resourceId={reviewer.id} />}
          <div className="mt-6"><DocumentReader content={content} kind="reviewer" related={related} next={<><Link href={`/study/flashcards/${reviewer.id}`} className="journal-link">Remember with flashcards <BookOpen className="h-4 w-4" /></Link><Link href={`/quizzes?fromReviewer=${reviewer.id}`} className="journal-link">Test your understanding <Sparkles className="h-4 w-4" /></Link></>} /></div>
        </>
      )}
    </div>
  );
}
