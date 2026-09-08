import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { createCollection, listCollectionsForOwner } from "@/lib/share-collections-repo";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(2000).optional(),
});

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await listCollectionsForOwner(user.id);
  return NextResponse.json({ collections });
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Book." }, { status: 400 });
  }

  const collection = await createCollection({ ownerId: user.id, ...parsed.data });
  return NextResponse.json({ collection }, { status: 201 });
});
