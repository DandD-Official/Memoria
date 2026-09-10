import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const addSchema = z.object({ email: z.string().email().max(320), permission: z.enum(["VIEW", "EDIT"]).default("VIEW"), allowExport: z.boolean().default(false) });
const updateSchema = z.object({ memberId: z.string().min(1), permission: z.enum(["VIEW", "EDIT"]), allowExport: z.boolean().default(false) });

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, currentUser, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const [collection, recipient] = await Promise.all([
    prisma.shareCollection.findFirst({ where: { id, ownerId: currentUser.id }, select: { id: true, slug: true, title: true } }),
    prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() }, select: { id: true, name: true, email: true } }),
  ]);
  if (!collection) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  if (!recipient) return NextResponse.json({ error: "No Memoria user found with that email." }, { status: 404 });
  if (recipient.id === currentUser.id) return NextResponse.json({ error: "You already own this Book." }, { status: 400 });
  const member = await prisma.shareCollectionMember.upsert({
    where: { collectionId_userId: { collectionId: id, userId: recipient.id } },
    update: { permission: parsed.data.permission, allowExport: parsed.data.allowExport },
    create: { collectionId: id, userId: recipient.id, permission: parsed.data.permission, allowExport: parsed.data.allowExport },
    include: { user: { select: { name: true, email: true } } },
  });
  const notification = await prisma.notification.create({
    data: { userId: recipient.id, type: "COLLECTION_SHARED", title: "A Book was shared with you", message: collection.title },
  });
  const destination = parsed.data.permission === "EDIT" ? `/books/${collection.id}` : `/c/${collection.slug}`;
  await prisma.notification.update({ where: { id: notification.id }, data: { href: `${destination}?notification=${notification.id}` } });
  return NextResponse.json({ member }, { status: 201 });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, currentUser, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose Viewer or Editor access." }, { status: 400 });
  const member = await prisma.shareCollectionMember.findFirst({ where: { id: parsed.data.memberId, collectionId: id, collection: { ownerId: currentUser.id } } });
  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  const updated = await prisma.shareCollectionMember.update({ where: { id: member.id }, data: { permission: parsed.data.permission, allowExport: parsed.data.allowExport }, include: { user: { select: { name: true, email: true } } } });
  return NextResponse.json({ member: updated });
});

export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, currentUser] = await Promise.all([context.params, requireUserOrNull()]);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "Missing member." }, { status: 400 });
  const result = await prisma.shareCollectionMember.deleteMany({ where: { id: memberId, collectionId: id, collection: { ownerId: currentUser.id } } });
  if (!result.count) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return NextResponse.json({ success: true });
});
