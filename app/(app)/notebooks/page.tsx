import { CollectionsList } from "@/components/collections/collections-list";
import { requireUser } from "@/lib/auth/session";
import { listCollectionsForOwner } from "@/lib/share-collections-repo";

export default async function NotebooksPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const collections = await listCollectionsForOwner(user.id);
  return <CollectionsList kind="NOTEBOOK" initiallyCreating={query.create === "1"} initialCollections={collections.filter(collection => collection.kind === "NOTEBOOK").map(collection => ({ ...collection, updatedAt: collection.updatedAt.toISOString() }))} />;
}
