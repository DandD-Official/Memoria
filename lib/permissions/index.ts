import { prisma } from "@/lib/db";
import type { Permission, ResourceType } from "@prisma/client";

/**
 * Every protected resource (Note, Reviewer, Quiz) must pass through one of
 * these helpers before a request is allowed to read or mutate it. Never
 * trust that an id in a URL or request body belongs to the caller — this is
 * the single place that answers "is this user allowed to do this".
 */

const ownerLookup: Record<ResourceType, (id: string) => Promise<{ ownerId: string } | null>> = {
  NOTE: (id) => prisma.note.findUnique({ where: { id }, select: { ownerId: true } }),
  REVIEWER: (id) => prisma.reviewer.findUnique({ where: { id }, select: { ownerId: true } }),
  QUIZ: (id) => prisma.quiz.findUnique({ where: { id }, select: { ownerId: true } }),
  DIAGRAM: (id) => prisma.diagram.findUnique({ where: { id }, select: { ownerId: true } }),
};

export type AccessLevel = "OWNER" | "EDIT" | "VIEW" | "NONE";

export async function getAccessLevelForOwner(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  ownerId: string
): Promise<AccessLevel> {
  if (ownerId === userId) return "OWNER";
  const share = await prisma.resourceShare.findUnique({
    where: { resourceId_resourceType_userId: { resourceId, resourceType, userId } },
    select: { permission: true },
  });
  if (!share) return "NONE";
  return share.permission === "EDIT" ? "EDIT" : "VIEW";
}

/**
 * Resolves the effective access level a user has on a resource: direct
 * ownership beats an explicit share, and no row/share means no access.
 * Deleted or missing resources also resolve to "NONE" so callers can return
 * a uniform 404 instead of leaking existence.
 */
export async function getAccessLevel(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<AccessLevel> {
  const resource = await ownerLookup[resourceType](resourceId);
  if (!resource) return "NONE";
  return getAccessLevelForOwner(userId, resourceType, resourceId, resource.ownerId);
}

export async function canView(userId: string, resourceType: ResourceType, resourceId: string) {
  const level = await getAccessLevel(userId, resourceType, resourceId);
  return level !== "NONE";
}

export async function canEdit(userId: string, resourceType: ResourceType, resourceId: string) {
  const level = await getAccessLevel(userId, resourceType, resourceId);
  return level === "OWNER" || level === "EDIT";
}

export async function isOwner(userId: string, resourceType: ResourceType, resourceId: string) {
  const level = await getAccessLevel(userId, resourceType, resourceId);
  return level === "OWNER";
}

/** Removes polymorphic rows that cannot be protected by database foreign keys. */
export async function deleteSharesForResource(resourceType: ResourceType, resourceId: string) {
  await prisma.$transaction([
    prisma.resourceShare.deleteMany({ where: { resourceType, resourceId } }),
    prisma.resourceInvite.deleteMany({ where: { resourceType, resourceId } }),
    prisma.publicResourceLink.deleteMany({ where: { resourceType, resourceId } }),
    prisma.shareCollectionItem.deleteMany({ where: { resourceType, resourceId } }),
    prisma.shareFeedback.deleteMany({ where: { resourceType, resourceId } }),
  ]);
}

export async function shareResource(params: {
  ownerId: string;
  resourceType: ResourceType;
  resourceId: string;
  granteeEmail: string;
  permission: Permission;
}) {
  const owns = await isOwner(params.ownerId, params.resourceType, params.resourceId);
  if (!owns) {
    throw new Error("Only the owner can share this resource.");
  }

  const grantee = await prisma.user.findUnique({ where: { email: params.granteeEmail.toLowerCase().trim() } });
  if (!grantee) {
    throw new Error("No Memoria user found with that email.");
  }
  if (grantee.id === params.ownerId) {
    throw new Error("You already own this resource.");
  }

  const share = await prisma.resourceShare.upsert({
    where: {
      resourceId_resourceType_userId: {
        resourceId: params.resourceId,
        resourceType: params.resourceType,
        userId: grantee.id,
      },
    },
    update: { permission: params.permission },
    create: {
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      ownerId: params.ownerId,
      userId: grantee.id,
      permission: params.permission,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await prisma.notification.create({ data: { userId: grantee.id, type: "RESOURCE_SHARED", title: `A ${params.resourceType.toLowerCase()} was shared with you`, message: `You received ${params.permission.toLowerCase()} access.`, href: `/${params.resourceType.toLowerCase()}s/${params.resourceId}` } });
  return share;
}

export async function revokeShare(params: {
  ownerId: string;
  resourceType: ResourceType;
  resourceId: string;
  shareId: string;
}) {
  const owns = await isOwner(params.ownerId, params.resourceType, params.resourceId);
  if (!owns) {
    throw new Error("Only the owner can revoke access.");
  }
  const result = await prisma.resourceShare.deleteMany({
    where: {
      id: params.shareId,
      ownerId: params.ownerId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    },
  });
  if (result.count !== 1) {
    throw new Error("Share not found for this resource.");
  }
}
