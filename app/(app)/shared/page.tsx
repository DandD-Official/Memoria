import { Share2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { PageDescription, PageHeader, PageHeaderContent, PageShell, PageTitle } from "@/components/ui/page";
import { ResourceCard, type ResourceKind } from "@/components/library/resource-card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

const resourceRoutes: Record<string, string> = { NOTE: "/notes", REVIEWER: "/reviewers", QUIZ: "/quizzes", DIAGRAM: "/diagrams" };
const resourceKinds: Record<string, ResourceKind> = { NOTE: "note", REVIEWER: "reviewer", QUIZ: "quiz", DIAGRAM: "diagram" };

export default async function SharedWithMePage() {
  const user = await requireUser();
  const [shares, bookMemberships] = await Promise.all([
    prisma.resourceShare.findMany({ where: { userId: user.id }, include: { owner: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.shareCollectionMember.findMany({ where: { userId: user.id }, include: { collection: { include: { owner: { select: { name: true, email: true } }, _count: { select: { items: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);

  const ids = (type: string) => shares.filter((share) => share.resourceType === type).map((share) => share.resourceId);
  const [notes, reviewers, quizzes, diagrams] = await Promise.all([
    prisma.note.findMany({ where: { id: { in: ids("NOTE") } }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { id: { in: ids("REVIEWER") } }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: { id: { in: ids("QUIZ") } }, select: { id: true, title: true } }),
    prisma.diagram.findMany({ where: { id: { in: ids("DIAGRAM") } }, select: { id: true, title: true } }),
  ]);
  const titleMap = new Map([...notes, ...reviewers, ...quizzes, ...diagrams].map((resource) => [resource.id, resource.title]));

  return (
    <PageShell className="max-w-5xl">
      <PageHeader><PageHeaderContent><PageTitle>Shared with Me</PageTitle><PageDescription>Books, Memories, and study resources other people have invited you to use.</PageDescription></PageHeaderContent></PageHeader>

      {shares.length === 0 && bookMemberships.length === 0 ? (
        <EmptyState icon={Share2} title="Nothing shared with you yet" description="When someone shares a Book or study resource with your account, it will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookMemberships.map(({ collection, id, createdAt, permission }) => (
            <ResourceCard key={id} href={permission === "EDIT" ? `/books/${collection.id}` : `/c/${collection.slug}`} kind="book" title={collection.title} badge={`${collection._count.items} items`} meta={formatRelativeTime(createdAt)} description={`Shared by ${collection.owner.name || collection.owner.email}`}>
              <Badge tone={permission === "EDIT" ? "accent" : "neutral"}>{permission}</Badge>
            </ResourceCard>
          ))}
          {shares.map((share) => {
            const route = resourceRoutes[share.resourceType] ?? "/shared";
            const href = share.resourceType === "DIAGRAM" ? route : `${route}/${share.resourceId}`;
            return (
              <ResourceCard key={share.id} href={href} kind={resourceKinds[share.resourceType] ?? "note"} title={titleMap.get(share.resourceId) ?? "Unavailable resource"} badge={share.resourceType === "NOTE" ? "Memory" : share.resourceType} meta={formatRelativeTime(share.createdAt)} description={`Shared by ${share.owner.name || share.owner.email}`}>
                <Badge tone={share.permission === "EDIT" ? "accent" : "neutral"}>{share.permission}</Badge>
              </ResourceCard>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
