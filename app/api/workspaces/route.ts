import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createWorkspaceSchema } from "@/lib/workspaces/schema";
import { createWorkspace } from "@/lib/workspaces/repository";
import { workspaceRoute } from "@/lib/workspaces/http";
import { isRateLimited } from "@/lib/rate-limit";

export const GET = workspaceRoute(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to open workspaces." }, { status: 401 });
  await prisma.workspace.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const workspaces = await prisma.workspace.findMany({ where: { expiresAt: { gt: new Date() }, OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] }, select: { id: true, title: true, ownerId: true, expiresAt: true, updatedAt: true, _count: { select: { notes: true, members: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return NextResponse.json({ workspaces, userId: user.id });
});
export const POST = workspaceRoute(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to create a workspace." }, { status: 401 });
  if (await isRateLimited(`workspace-create:${user.id}`, 10, 60_000)) return NextResponse.json({ error: "Please wait a minute before creating another workspace." }, { status: 429 });
  const parsed = createWorkspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  return NextResponse.json(await createWorkspace(user.id, parsed.data.title), { status: 201 });
});
