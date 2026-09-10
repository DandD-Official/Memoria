"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Sparkles, ArrowLeft, Pencil, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { MarkdownEditor } from "@/components/markdown/editor";
import { MarkdownRenderer } from "@/components/markdown/renderer";
import { formatDate } from "@/lib/utils";
import { ResourceDetailActions, ResourceFavoriteButton, ResourceUtilityActions } from "@/components/library/resource-actions";
import { TagEditor } from "@/components/library/tag-editor";
import { RevisionHistory } from "@/components/library/revision-history";
import { ExportMenu } from "@/components/exports/export-menu";
import type { ExportProgressHandler } from "@/lib/export/types";

interface NoteDetailProps {
  note: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    sourceType: string;
    updatedAt: string;
    archived: boolean;
    favorite: boolean;
  };
  canEdit: boolean;
  isOwner: boolean;
  autoSave: boolean;
}

export function NoteDetail({ note, canEdit, isOwner, autoSave }: NoteDetailProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastSaved = useRef(`${note.title}\u0000${note.content}`);
  const savedValues = useRef({ title: note.title, content: note.content });

  useEffect(() => {
    if (!autoSave || !canEdit || !isEditing) return;
    const signature = `${title}\u0000${content}`;
    if (signature === lastSaved.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const response = await fetch(`/api/notes/${note.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Memora-Autosave": "1" }, body: JSON.stringify({ title, content }) });
      setSaving(false);
      if (response.ok) { lastSaved.current = signature; savedValues.current = { title, content }; setSaved(true); window.setTimeout(() => setSaved(false), 1500); }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoSave, canEdit, content, isEditing, note.id, title]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setSaving(false);
    if (res.ok) {
      lastSaved.current = `${title}\u0000${content}`;
      savedValues.current = { title, content };
      setSaved(true);
      setIsEditing(false);
      // Clear the client router cache so the Notes list and dashboard
      // immediately receive the updated title and timestamp on navigation.
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function cancelEditing() {
    setTitle(savedValues.current.title);
    setContent(savedValues.current.content);
    setIsEditing(false);
  }

  async function handleDelete() {
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    router.replace("/notes");
  }

  async function handleExport(format: string, onProgress?: ExportProgressHandler) {
    if (format === "pdf") { const { exportMarkdownToPdf } = await import("@/lib/pdf-export"); await exportMarkdownToPdf(title, content, onProgress); return; }
    if (format === "docx") { const { exportMarkdownToWord } = await import("@/lib/word-export"); await exportMarkdownToWord(title, content, onProgress); return; }
    window.location.href = `/api/notes/export?id=${note.id}&format=${format}`;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/notes" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to notes
      </Link>

      <div className="mb-7 border-b border-line pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge tone="neutral">{note.sourceType}</Badge>
            {!isEditing && <h1 className="mt-3 break-words font-display text-2xl text-ink">{title}</h1>}
            {!isEditing && <p className="mt-1 text-xs text-ink-faint">Last updated {formatDate(note.updatedAt)}</p>}
          </div>
          <ResourceDetailActions
            edit={canEdit && !isEditing ? <Button variant="primary" size="sm" onClick={() => { setSaved(false); setIsEditing(true); }}><Pencil className="h-3.5 w-3.5" /> Edit</Button> : undefined}
            study={<>
              <Button variant="secondary" size="sm" onClick={() => router.push(`/reviewers?fromNote=${note.id}`)}><Sparkles className="h-3.5 w-3.5" /> Build reviewer</Button>
              <Button variant="secondary" size="sm" onClick={() => router.push(`/quizzes?fromNote=${note.id}`)}><ListChecks className="h-3.5 w-3.5" /> Create quiz</Button>
            </>}
            favorite={isOwner ? <ResourceFavoriteButton resourceType="NOTE" resourceId={note.id} favorite={note.favorite} /> : <span />}
            share={isOwner ? <ShareDialog resourceType="NOTE" resourceId={note.id} /> : undefined}
            tools={<>
              <ExportMenu options={[{ value: "pdf", label: "PDF document" }, { value: "docx", label: "Word document" }, { value: "md", label: "Markdown" }, { value: "json", label: "Memoria JSON" }]} onExport={handleExport} />
              {isOwner && <ResourceUtilityActions resourceType="NOTE" resourceId={note.id} archived={note.archived} />}
              {isOwner && <RevisionHistory resourceType="NOTE" resourceId={note.id} />}
              {isOwner && <ConfirmDialog trigger={<Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5 text-danger" /> Delete</Button>} title="Delete this note?" description="This can't be undone. Reviewers built from this note will keep their content." confirmLabel="Delete" destructive onConfirm={handleDelete} />}
            </>}
          />
        </div>
      </div>

      {canEdit && isEditing ? (
        <>
          {isOwner && <TagEditor resourceType="NOTE" resourceId={note.id} />}
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 font-display text-lg" />
          <Label>Content (Markdown)</Label>
          <MarkdownEditor value={content} onChange={setContent} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">Last updated {formatDate(note.updatedAt)}</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={cancelEditing} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>{saved ? "Saved" : "Save changes"}</Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-card border border-line bg-surface p-6">
            <MarkdownRenderer content={content} />
          </div>
        </>
      )}
    </div>
  );
}
