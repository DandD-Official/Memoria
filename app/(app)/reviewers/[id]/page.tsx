import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import { ReviewerDetail } from "@/components/reviewers/reviewer-detail";
import { findReviewerById } from "@/lib/reviewers-repo";
import { prisma } from "@/lib/db";

export default async function ReviewerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const [reviewer, settings] = await Promise.all([findReviewerById(params.id, { noteLinks: true }), prisma.userSettings.findUnique({ where: { userId: user.id }, select: { autoSave: true } })]);
  if (!reviewer) notFound();
  const access = await getAccessLevelForOwner(user.id, "REVIEWER", params.id, reviewer.ownerId);
  if (access === "NONE") notFound();
  const [sources, quizzes] = await Promise.all([
    prisma.note.findMany({ where: { ownerId: user.id, reviewerLinks: { some: { reviewerId: reviewer.id } } }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: { ownerId: user.id, archivedAt: null, reviewerLinks: { some: { reviewerId: reviewer.id } } }, select: { id: true, title: true } }),
  ]);

  const noteLinks = reviewer.noteLinks as unknown[];

  return (
    <ReviewerDetail
      reviewer={{
        id: reviewer.id,
        title: reviewer.title,
        description: reviewer.description,
        style: reviewer.style,
        content: reviewer.content,
        updatedAt: reviewer.updatedAt.toISOString(),
        noteCount: noteLinks.length,
        archived: Boolean(reviewer.archivedAt),
        favorite: reviewer.isFavorite,
      }}
      isOwner={access === "OWNER"}
      canEdit={access === "OWNER" || access === "EDIT"}
      related={[...sources.map(item => ({ ...item, href: `/notes/${item.id}` })), ...quizzes.map(item => ({ ...item, href: `/quizzes/${item.id}` }))]}
      autoSave={settings?.autoSave ?? true}
    />
  );
}
