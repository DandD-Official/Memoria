import { notFound } from "next/navigation";
import { CollectionEditor } from "@/components/collections/collection-editor";
import { requireUser } from "@/lib/auth/session";
import { getCollectionEditorData } from "@/lib/share-collections-repo";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const data = await getCollectionEditorData(user.id, id);
  if (!data.collection) notFound();

  return (
    <CollectionEditor
      initialCollection={{ id: data.collection.id, title: data.collection.title, description: data.collection.description, slug: data.collection.slug, isPublished: data.collection.isPublished, expiresAt: data.collection.expiresAt?.toISOString() ?? null, passwordProtected: Boolean(data.collection.passwordHash), items: data.collection.items.map((item) => ({ id: item.id, resourceType: item.resourceType as "NOTE" | "REVIEWER" | "QUIZ", resourceId: item.resourceId })), members: data.collection.members.map((member) => ({ id: member.id, name: member.user.name, email: member.user.email })) }}
      rows={data.rows}
      initialFeedback={data.feedback.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
    />
  );
}
