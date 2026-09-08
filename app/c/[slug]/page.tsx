import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicCollectionBySlug } from "@/lib/share-collections-repo";
import { PublicCollectionView } from "@/components/collections/public-collection-view";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, validCollectionAccessToken } from "@/lib/collections/access";
import { CollectionPasswordGate } from "@/components/collections/collection-password-gate";
import { requireUserOrNull } from "@/lib/auth/session";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const collection = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { title: true, description: true, isPublished: true } });
  if (!collection?.isPublished) return { title: "Private Book — Memoria" };
  return {
    title: `${collection.title} — Memoria`,
    description: collection.description ?? "A Book shared on Memoria.",
  };
}

// Public, unauthenticated page — no (app) layout, no session required.
// Everything rendered here comes only from items the owner explicitly
// added to this collection (see lib/share-collections-repo.ts).
export default async function PublicCollectionPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const user = await requireUserOrNull();
  const gate = await prisma.shareCollection.findUnique({ where: { slug: params.slug }, select: { id: true, ownerId: true, title: true, passwordHash: true, isPublished: true, expiresAt: true, members: user ? { where: { userId: user.id }, select: { id: true } } : false } });
  const privateAccess = Boolean(user && gate && (gate.ownerId === user.id || ("members" in gate && Array.isArray(gate.members) && gate.members.length > 0)));
  if (!gate || (!gate.isPublished && !privateAccess) || (gate.expiresAt && gate.expiresAt <= new Date())) notFound();
  const cookieStore = await cookies();
  const access = privateAccess || !gate.passwordHash || validCollectionAccessToken(params.slug, cookieStore.get(collectionAccessCookieName(params.slug))?.value);
  if (!access) return <CollectionPasswordGate slug={params.slug} title={gate.title} />;
  const collection = await getPublicCollectionBySlug(params.slug, true, user?.id);
  if (!collection) notFound();

  return <PublicCollectionView collection={collection} />;
}
