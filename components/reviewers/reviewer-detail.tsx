"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/markdown/renderer";
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
  autoSave: boolean;
}

export function ReviewerDetail({ reviewer, isOwner, autoSave }: ReviewerDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reviewer.title);
  const [content, setContent] = useState(reviewer.content);
  const [saving, setSaving] = useState(false);
  const lastSaved = useRef(`${reviewer.title}\u0000${reviewer.content}`);

  useEffect(() => {
    if (!editing || !autoSave || !isOwner) return;
    const signature = `${title}\u0000${content}`;
    if (signature === lastSaved.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const response = await fetch(`/api/reviewers/${reviewer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Memora-Autosave": "1" }, body: JSON.stringify({ title, content }) });
      setSaving(false);
      if (response.ok) lastSaved.current = signature;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoSave, content, editing, isOwner, reviewer.id, title]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/reviewers/${reviewer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    if (res.ok) {
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
    <div className="mx-auto max-w-3xl">
      <Link href="/reviewers" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to reviewers
      </Link>

      <div className="mb-7 border-b border-line pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge tone="accent">{reviewer.style}</Badge>
            {!editing && <h1 className="mt-3 break-words font-display text-2xl text-ink">{title}</h1>}
            {!editing && reviewer.description && <p className="mt-1 text-ink-soft">{reviewer.description}</p>}
            {!editing && <p className="mt-1 text-xs text-ink-faint">Last updated {formatDate(reviewer.updatedAt)}{reviewer.noteCount > 0 && ` · Built from ${reviewer.noteCount} ${reviewer.noteCount === 1 ? "note" : "notes"}`}</p>}
          </div>
          <ResourceDetailActions
            edit={isOwner && !editing ? <Button variant="primary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button> : undefined}
            study={<Link href={`/quizzes?fromReviewer=${reviewer.id}`} className="inline-flex min-h-9 w-full items-center gap-1.5 rounded-control bg-accent px-3 text-sm font-medium text-ink hover:bg-accent-dark hover:text-white"><Sparkles className="h-3.5 w-3.5" /> Create quiz</Link>}
            favorite={isOwner ? <ResourceFavoriteButton resourceType="REVIEWER" resourceId={reviewer.id} favorite={reviewer.favorite} /> : <span />}
            share={isOwner ? <ShareDialog resourceType="REVIEWER" resourceId={reviewer.id} /> : undefined}
            tools={<>
              <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "md", label: "Markdown" }, { value: "json", label: "Memoria JSON" }]} onExport={handleExport} />
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
          <div className="mt-6 border-t border-line pt-6">
            <MarkdownRenderer content={content} />
          </div>
        </>
      )}
    </div>
  );
}
