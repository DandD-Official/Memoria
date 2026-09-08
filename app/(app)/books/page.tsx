import { CollectionsList } from "@/components/collections/collections-list";
import { requireUser } from "@/lib/auth/session";
import { listCollectionsForOwner } from "@/lib/share-collections-repo";

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const collections = await listCollectionsForOwner(user.id);
  return <CollectionsList initiallyCreating={query.create === "1"} initialCollections={collections.map((collection) => ({ ...collection, updatedAt: collection.updatedAt.toISOString() }))} />;
}
