import { notFound } from "next/navigation";
import { CollectionEditor } from "@/components/collections/collection-editor";
import { requireUser } from "@/lib/auth/session";
import { getCollectionEditorData } from "@/lib/share-collections-repo";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCollectionEditorData(user.id, id);
  if (!data.collection) notFound();

  return (
    <CollectionEditor
      access={data.access}
      initialCollection={{ id: data.collection.id, title: data.collection.title, subtitle: data.collection.subtitle, description: data.collection.description, tocTitle: data.collection.tocTitle, slug: data.collection.slug, isPublished: data.collection.isPublished, linkPermission: data.collection.linkPermission === "EDIT" ? "EDIT" : "VIEW", allowExport: data.collection.allowExport, expiresAt: data.collection.expiresAt?.toISOString() ?? null, passwordProtected: Boolean(data.collection.passwordHash), items: data.collection.items.map((item) => ({ id: item.id, resourceType: item.resourceType as "NOTE" | "REVIEWER" | "QUIZ", resourceId: item.resourceId })), members: data.collection.members.map((member) => ({ id: member.id, name: member.user.name, email: member.user.email, permission: member.permission === "EDIT" ? "EDIT" : "VIEW", allowExport: member.allowExport })) }}
      canExport={data.canExport}
      rows={data.rows}
    />
  );
}
