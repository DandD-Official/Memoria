import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { NoteDetail } from "@/components/notes/note-detail";
import { findNoteById } from "@/lib/notes-repo";
import { prisma } from "@/lib/db";
import { hasSystemAiConnection } from "@/lib/ai/system";

export default async function NoteDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const [note, settings] = await Promise.all([findNoteById(params.id), prisma.userSettings.findUnique({ where: { userId: user.id }, select: { autoSave: true } })]);
  if (!note) notFound();
  const access = await getAccessLevelForOwner(user.id, "NOTE", params.id, note.ownerId);
  if (access === "NONE") notFound();
  const connectedGuides = await prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null, noteLinks: { some: { noteId: note.id } } }, select: { id: true, title: true } });

  return (
    <NoteDetail
      note={{
        id: note.id,
        title: note.title,
        description: note.description,
        content: note.content,
        sourceType: note.sourceType,
        updatedAt: note.updatedAt.toISOString(),
        archived: Boolean(note.archivedAt),
        favorite: note.isFavorite,
      }}
      canEdit={access === "OWNER" || access === "EDIT"}
      isOwner={access === "OWNER"}
      autoSave={settings?.autoSave ?? true}
      systemAvailable={hasSystemAiConnection()}
      related={connectedGuides.map(item => ({ ...item, href: `/reviewers/${item.id}` }))}
    />
  );
}
