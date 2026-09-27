import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { workspaceActionSchema } from "@/lib/workspaces/schema";
import { changeWorkspace, deleteWorkspace, readWorkspace } from "@/lib/workspaces/repository";
import { workspaceRoute } from "@/lib/workspaces/http";
import { isRateLimited } from "@/lib/rate-limit";
type Context = { params: Promise<{ id: string }> };

export const GET = workspaceRoute(async (request: Request, context: Context) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to open this workspace." }, { status: 401 });
  const workspace = await readWorkspace((await context.params).id, user.id, request.headers.get("if-none-match"));
  return workspace ? NextResponse.json(workspace, { headers: { ETag: `"${workspace.version}"` } }) : new NextResponse(null, { status: 304 });
});
export const PATCH = workspaceRoute(async (request: Request, context: Context) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to edit this workspace." }, { status: 401 });
  if (await isRateLimited(`workspace-edit:${user.id}`, 120, 60_000)) return NextResponse.json({ error: "Too many changes. Wait a moment and try again." }, { status: 429 });
  const parsed = workspaceActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  return NextResponse.json(await changeWorkspace((await context.params).id, user.id, parsed.data));
});
export const DELETE = workspaceRoute(async (_request: Request, context: Context) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in to delete this workspace." }, { status: 401 });
  await deleteWorkspace((await context.params).id, user.id);
  return NextResponse.json({ success: true });
});
