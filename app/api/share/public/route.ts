import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { isOwner } from "@/lib/permissions";
import { appUrl } from "@/lib/email";
import { withApiErrorHandling } from "@/lib/api/handler";
import type { ResourceType } from "@prisma/client";

const PUBLIC_TYPES: ResourceType[] = ["NOTE", "REVIEWER", "QUIZ"];

function publicUrl(token: string) {
  return appUrl("/s/" + token);
}

function readResource(request: Request) {
  const { searchParams } = new URL(request.url);
  return { resourceType: searchParams.get("resourceType") as ResourceType, resourceId: searchParams.get("resourceId") };
}

function validResource(resourceType: ResourceType, resourceId: unknown): resourceId is string {
  return PUBLIC_TYPES.includes(resourceType) && typeof resourceId === "string" && resourceId.length > 0;
}

export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { resourceType, resourceId } = readResource(request);
  if (!validResource(resourceType, resourceId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await isOwner(user.id, resourceType, resourceId))) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  const link = await prisma.publicResourceLink.findUnique({ where: { resourceId_resourceType: { resourceId, resourceType } }, select: { token: true } });
  return NextResponse.json({ url: link ? publicUrl(link.token) : null });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType as ResourceType;
  const resourceId = body?.resourceId;
  if (!validResource(resourceType, resourceId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await isOwner(user.id, resourceType, resourceId))) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  const link = await prisma.publicResourceLink.upsert({
    where: { resourceId_resourceType: { resourceId, resourceType } },
    update: { ownerId: user.id },
    create: { resourceId, resourceType, ownerId: user.id, token: randomBytes(24).toString("base64url") },
    select: { token: true },
  });
  return NextResponse.json({ url: publicUrl(link.token) }, { status: 201 });
});

export const DELETE = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType as ResourceType;
  const resourceId = body?.resourceId;
  if (!validResource(resourceType, resourceId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!(await isOwner(user.id, resourceType, resourceId))) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  await prisma.publicResourceLink.deleteMany({ where: { resourceId, resourceType, ownerId: user.id } });
  return NextResponse.json({ success: true });
});
