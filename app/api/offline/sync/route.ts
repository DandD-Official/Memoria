import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { canEdit } from "@/lib/permissions";
import { withApiErrorHandling } from "@/lib/api/handler";
import { compressText, decompressText } from "@/lib/compression";
import { updateNoteSchema } from "@/lib/validation/note";
import { updateReviewerSchema } from "@/lib/validation/reviewer";

const syncSchema = z.object({
  userId: z.string().min(1),
  path: z.string().regex(/^\/api\/(notes|reviewers)\/[a-zA-Z0-9_-]+$/),
  updatedAt: z.string().datetime(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2_000_000),
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Sign in online to sync. Your local edits are kept." }, { status: 401 });
  const parsed = syncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid offline document." }, { status: 400 });
  const input = parsed.data;
  if (input.userId !== user.id) return NextResponse.json({ error: "Sign in to the account that owns this offline data." }, { status: 403 });
  const [, , section, id] = input.path.split("/");
  const resourceType = section === "notes" ? "NOTE" : "REVIEWER";
  if (!await canEdit(user.id, resourceType, id)) return NextResponse.json({ error: "This document was removed or you no longer have edit access. Your local draft is kept." }, { status: 403 });
  const validated = (resourceType === "NOTE" ? updateNoteSchema : updateReviewerSchema).safeParse({ title: input.title, content: input.content });
  if (!validated.success) return NextResponse.json({ error: validated.error.issues[0]?.message }, { status: 400 });
  const title = validated.data.title!;
  const content = validated.data.content!;

  try {
    const result = await prisma.$transaction(async tx => {
      const current = resourceType === "NOTE" ? await tx.note.findUnique({ where: { id } }) : await tx.reviewer.findUnique({ where: { id } });
      if (!current) return null;
      if (current.ownerId !== user.id) {
        const share = await tx.resourceShare.findUnique({ where: { resourceId_resourceType_userId: { resourceId: id, resourceType, userId: user.id } } });
        if (share?.permission !== "EDIT") return null;
      }
      const oldContent = decompressText(current.content);
      // A lost response can cause replay. Identical content is already synced,
      // even when the client's base timestamp predates that successful write.
      if (current.title === title && oldContent === content) return current.updatedAt;
      if (current.updatedAt.toISOString() !== input.updatedAt) return null;
      const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
      const args = { where: { id, updatedAt: new Date(input.updatedAt) }, data: { title, content: compressText(content), updatedAt } };
      const changed = resourceType === "NOTE" ? await tx.note.updateMany(args) : await tx.reviewer.updateMany(args);
      if (changed.count !== 1) return null;
      await tx.resourceRevision.create({ data: { ownerId: current.ownerId, resourceId: id, resourceType, snapshot: { title: current.title, description: current.description, content: oldContent } } });
      return updatedAt;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) return NextResponse.json({ error: "A newer version exists. Your local draft has been kept for review." }, { status: 409 });
    for (const path of [`/${section}/${id}`, `/${section}`, "/dashboard", "/library", "/search"]) revalidatePath(path);
    return NextResponse.json({ updatedAt: result.toISOString(), title, content });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Another save is in progress. Your local draft will retry." }, { status: 503 });
    throw error;
  }
});
