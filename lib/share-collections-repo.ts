import { prisma } from "@/lib/db";
import { decompressText } from "@/lib/compression";
import { randomBytes } from "crypto";
import type { Permission, ResourceType } from "@prisma/client";

function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

export async function createCollection(params: { ownerId: string; title: string; description?: string }) {
  let slug = generateSlug();
  // Extremely unlikely, but guard against a slug collision anyway.
  for (let i = 0; i < 3; i++) {
    const existing = await prisma.shareCollection.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateSlug();
  }
  return prisma.shareCollection.create({
    data: { ownerId: params.ownerId, title: params.title, description: params.description, slug },
  });
}

export async function listCollectionsForOwner(ownerId: string) {
  return prisma.shareCollection.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    include: { items: { orderBy: { position: "asc" }, select: { id: true } }, progress: { where: { userId: ownerId }, take: 1, select: { lastItemId: true, lastAccessedAt: true } }, _count: { select: { items: true, feedback: true, members: true } } },
  });
}

export async function findCollectionForOwner(ownerId: string, id: string) {
  return prisma.shareCollection.findFirst({
    where: { id, ownerId },
    include: { items: { orderBy: { position: "asc" } }, members: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } } },
  });
}

export type BookAccess = Extract<Permission, "VIEW" | "EDIT" | "OWNER">;

export function resolveBookAccess(input: { viewerUserId?: string; ownerId: string; memberPermission?: Permission; isPublished: boolean; linkPermission: Permission; linkRequiresPassword?: boolean }): BookAccess | null {
  if (input.viewerUserId === input.ownerId) return "OWNER";
  if (input.memberPermission === "EDIT") return "EDIT";
  if (input.memberPermission === "VIEW") return "VIEW";
  if (!input.isPublished) return null;
  return input.linkPermission === "EDIT" && !input.linkRequiresPassword ? "EDIT" : "VIEW";
}

export async function getBookAccess(userId: string, id: string): Promise<BookAccess | null> {
  const book = await prisma.shareCollection.findUnique({
    where: { id },
    select: { ownerId: true, isPublished: true, linkPermission: true, passwordHash: true, members: { where: { userId }, select: { permission: true } } },
  });
  if (!book) return null;
  return resolveBookAccess({ viewerUserId: userId, ownerId: book.ownerId, memberPermission: book.members[0]?.permission, isPublished: book.isPublished, linkPermission: book.linkPermission, linkRequiresPassword: Boolean(book.passwordHash) });
}

export async function findCollectionForEditor(userId: string, id: string) {
  return prisma.shareCollection.findFirst({
    where: {
      id,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, permission: "EDIT" } } },
        {
          isPublished: true,
          linkPermission: "EDIT",
          passwordHash: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          members: { none: { userId, permission: "VIEW" } },
        },
      ],
    },
    include: { items: { orderBy: { position: "asc" } }, members: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } } },
  });
}

/** Loads only resources the actor may see: the owner's library for the owner,
 * or the Book's already-included resources for an editor. */
export async function getCollectionEditorData(userId: string, id: string) {
  const collection = await findCollectionForEditor(userId, id);
  if (!collection) return { collection: null, access: null, rows: { NOTE: [], REVIEWER: [], QUIZ: [] } };

  const memberPermission = collection.members.find((member) => member.userId === userId)?.permission;
  const access = resolveBookAccess({ viewerUserId: userId, ownerId: collection.ownerId, memberPermission, isPublished: collection.isPublished, linkPermission: collection.linkPermission, linkRequiresPassword: Boolean(collection.passwordHash) });
  if (access !== "OWNER" && access !== "EDIT") return { collection: null, access: null, rows: { NOTE: [], REVIEWER: [], QUIZ: [] } };
  const includedIds = (type: ResourceType) => collection.items.filter((item) => item.resourceType === type).map((item) => item.resourceId);
  const ownerFilter = access === "OWNER" ? { ownerId: collection.ownerId } : undefined;
  const [notes, reviewers, quizzes] = await Promise.all([
    prisma.note.findMany({ where: ownerFilter ?? { id: { in: includedIds("NOTE") } }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: ownerFilter ?? { id: { in: includedIds("REVIEWER") } }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: ownerFilter ?? { id: { in: includedIds("QUIZ") } }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
  ]);
  return { collection, access, rows: { NOTE: notes, REVIEWER: reviewers, QUIZ: quizzes } };
}

export async function updateCollection(
  userId: string,
  id: string,
  data: { title?: string; subtitle?: string | null; description?: string; tocTitle?: string; isPublished?: boolean; linkPermission?: "VIEW" | "EDIT"; isFavorite?: boolean; passwordHash?: Buffer | null; expiresAt?: Date | null }
) {
  const existing = await findCollectionForEditor(userId, id);
  if (!existing) throw new Error("Book not found.");
  return prisma.shareCollection.update({ where: { id }, data });
}

export async function deleteCollection(ownerId: string, id: string) {
  const existing = await findCollectionForOwner(ownerId, id);
  if (!existing) throw new Error("Book not found.");
  await prisma.shareCollection.delete({ where: { id } });
}

export async function addCollectionItem(
  userId: string,
  collectionId: string,
  item: { resourceType: ResourceType; resourceId: string }
) {
  const collection = await findCollectionForEditor(userId, collectionId);
  if (!collection) throw new Error("Book not found.");

  // Only the owner's own resources can be added — this is what prevents
  // someone from publishing a collection full of other people's private notes.
  const owns = await resourceBelongsTo(userId, item.resourceType, item.resourceId);
  if (!owns) throw new Error("You can only add your own notes, reviewers, or quizzes.");

  const position = collection.items.length;
  return prisma.shareCollectionItem.upsert({
    where: {
      collectionId_resourceType_resourceId: {
        collectionId,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
      },
    },
    update: {},
    create: { collectionId, resourceType: item.resourceType, resourceId: item.resourceId, position },
  });
}

export async function removeCollectionItem(userId: string, collectionId: string, itemId: string) {
  const collection = await findCollectionForEditor(userId, collectionId);
  if (!collection) throw new Error("Book not found.");
  await prisma.shareCollectionItem.deleteMany({ where: { id: itemId, collectionId } });
}

export async function reorderCollectionItems(userId: string, collectionId: string, itemIds: string[]) {
  const collection = await findCollectionForEditor(userId, collectionId);
  if (!collection || collection.items.length !== itemIds.length || collection.items.some((item) => !itemIds.includes(item.id))) throw new Error("Invalid Book order.");
  await prisma.$transaction(itemIds.map((id, position) => prisma.shareCollectionItem.update({ where: { id }, data: { position } })));
}

async function resourceBelongsTo(ownerId: string, resourceType: ResourceType, resourceId: string): Promise<boolean> {
  if (resourceType === "NOTE") {
    return Boolean(await prisma.note.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
  }
  if (resourceType === "REVIEWER") {
    return Boolean(await prisma.reviewer.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
  }
  return Boolean(await prisma.quiz.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } }));
}

export interface PublicCollectionNote {
  id: string;
  title: string;
  description: string | null;
  content: string;
}
export interface PublicCollectionReviewer {
  id: string;
  title: string;
  description: string | null;
  content: string;
}
export interface PublicCollectionQuiz {
  id: string;
  title: string;
  description: string | null;
  questions: unknown;
}
export interface PublicCollection {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  tocTitle: string;
  ownerName: string;
  items: Array<{ id: string; resourceType: ResourceType; resourceId: string }>;
  notes: PublicCollectionNote[];
  reviewers: PublicCollectionReviewer[];
  quizzes: PublicCollectionQuiz[];
  feedback: { id: string; authorName: string | null; authorUserId: string | null; message: string; createdAt: Date; updatedAt: Date; parentId: string | null }[];
  viewerUserId: string | null;
  viewerPermission: BookAccess;
  lastReadItemId: string | null;
  isPrivateAccess: boolean;
}

/**
 * Loads everything needed to render the public /c/[slug] page: only ever
 * items the owner explicitly added, hydrated read-only, and only when the
 * collection is published. Never exposes anything the owner didn't pick.
 */
export async function getPublicCollectionBySlug(slug: string, allowProtected = false, viewerUserId?: string): Promise<PublicCollection | null> {
  const collection = await prisma.shareCollection.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
      feedback: { orderBy: { createdAt: "asc" }, select: { id: true, authorName: true, authorUserId: true, message: true, createdAt: true, updatedAt: true, parentId: true } },
      members: viewerUserId ? { where: { userId: viewerUserId }, select: { id: true, permission: true } } : false,
      progress: viewerUserId ? { where: { userId: viewerUserId }, select: { lastItemId: true } } : false,
    },
  });
  if (!collection) return null;
  const memberPermission = "members" in collection && Array.isArray(collection.members) ? collection.members[0]?.permission : undefined;
  const isPrivateAccess = collection.ownerId === viewerUserId || Boolean(memberPermission);
  if ((!collection.isPublished && !isPrivateAccess) || (collection.expiresAt && collection.expiresAt <= new Date()) || (collection.passwordHash && !allowProtected && !isPrivateAccess)) return null;
  const viewerPermission = resolveBookAccess({ viewerUserId, ownerId: collection.ownerId, memberPermission, isPublished: collection.isPublished, linkPermission: collection.linkPermission, linkRequiresPassword: Boolean(collection.passwordHash) });
  if (!viewerPermission) return null;

  const noteIds = collection.items.filter((i) => i.resourceType === "NOTE").map((i) => i.resourceId);
  const reviewerIds = collection.items.filter((i) => i.resourceType === "REVIEWER").map((i) => i.resourceId);
  const quizIds = collection.items.filter((i) => i.resourceType === "QUIZ").map((i) => i.resourceId);

  const [rawNotes, rawReviewers, rawQuizzes] = await Promise.all([
    noteIds.length
      ? prisma.note.findMany({ where: { id: { in: noteIds } }, select: { id: true, title: true, description: true, content: true } })
      : [],
    reviewerIds.length
      ? prisma.reviewer.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, title: true, description: true, content: true } })
      : [],
    quizIds.length
      ? prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true, description: true, questions: true } })
      : [],
  ]);

  // Preserve the order the owner arranged items in.
  const orderIndex = new Map(collection.items.map((item, i) => [item.resourceId, i]));
  const byOrder = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    description: collection.description,
    tocTitle: collection.tocTitle,
    ownerName: collection.owner.name ?? "A Memoria user",
    items: collection.items.map(({ id, resourceType, resourceId }) => ({ id, resourceType, resourceId })),
    notes: byOrder(rawNotes.map((n) => ({ ...n, content: decompressText(n.content) }))),
    reviewers: byOrder(rawReviewers.map((r) => ({ ...r, content: decompressText(r.content) }))),
    quizzes: byOrder(rawQuizzes),
    feedback: collection.feedback,
    viewerUserId: viewerUserId ?? null,
    viewerPermission,
    lastReadItemId: "progress" in collection && Array.isArray(collection.progress) ? collection.progress[0]?.lastItemId ?? null : null,
    isPrivateAccess,
  };
}

export async function addFeedback(params: {
  slug: string;
  authorName?: string;
  message: string;
  resourceType?: ResourceType;
  resourceId?: string;
  authorUserId?: string;
  parentId?: string;
}) {
  const collection = await prisma.shareCollection.findUnique({ where: { slug: params.slug } });
  const privateMember = params.authorUserId ? await prisma.shareCollectionMember.findUnique({ where: { collectionId_userId: { collectionId: collection?.id ?? "", userId: params.authorUserId } } }) : null;
  if (!collection || (!collection.isPublished && !privateMember && collection.ownerId !== params.authorUserId) || (collection.expiresAt && collection.expiresAt <= new Date())) throw new Error("Book not found.");

  if (params.resourceType && params.resourceId) {
    const included = await prisma.shareCollectionItem.findUnique({
      where: {
        collectionId_resourceType_resourceId: {
          collectionId: collection.id,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        },
      },
      select: { id: true },
    });
    if (!included) throw new Error("That resource is not part of this Book.");
  }

  if (params.parentId) {
    const parent = await prisma.shareFeedback.findFirst({ where: { id: params.parentId, collectionId: collection.id }, select: { id: true } });
    if (!parent) throw new Error("Feedback thread not found.");
  }

  const feedback = await prisma.shareFeedback.create({
    data: {
      collectionId: collection.id,
      authorName: params.authorName?.trim() || null,
      authorUserId: params.authorUserId,
      parentId: params.parentId,
      message: params.message,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  });
  if (collection.ownerId !== params.authorUserId) await prisma.notification.create({ data: { userId: collection.ownerId, type: "COLLECTION_FEEDBACK", title: params.parentId ? "New feedback reply" : "New Book feedback", message: params.message.slice(0, 160), href: `/books/${collection.id}?feedback=${feedback.id}` } });
  return feedback;
}
