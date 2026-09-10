import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiErrorHandling } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// The session id is owned by the authenticated JWT. The client may include
// the id it rendered for backwards compatibility, but it must not be used as
// an equality check: the JWT can be refreshed between rendering the modal and
// clicking a choice.
const schema = z.object({ action: z.enum(["logout_other", "continue"]), sessionId: z.string().min(1).optional() });

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid session action." }, { status: 400 });

  const currentSessionId = user.sessionId;
  if (parsed.data.action === "logout_other") {
    if (!currentSessionId) return NextResponse.json({ error: "Your current session could not be identified. Please sign in again." }, { status: 409 });
    await prisma.activeSession.deleteMany({ where: { userId: user.id, id: { not: currentSessionId } } });
  }

  return NextResponse.json({ success: true, sessionId: currentSessionId ?? null });
});
