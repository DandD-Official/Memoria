import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { findCollectionForEditor, updateCollection, deleteCollection, getBookAccess } from "@/lib/share-collections-repo";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(240).nullable().optional(),
  description: z.string().max(2000).optional(),
  tocTitle: z.string().min(1).max(80).optional(),
  isPublished: z.boolean().optional(),
  linkPermission: z.enum(["VIEW", "EDIT"]).optional(),
  allowExport: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  password: z.string().max(128).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function safeCollection<T extends { passwordHash?: unknown }>(collection: T) {
  const { passwordHash, ...safe } = collection;
  return { ...safe, hasPassword: Boolean(passwordHash) };
}

export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await findCollectionForEditor(user.id, params.id);
  if (!collection) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  return NextResponse.json({ collection: safeCollection(collection) });
});

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    const access = await getBookAccess(user.id, params.id);
    if (!access || access === "VIEW") return NextResponse.json({ error: "You don't have permission to edit this Book." }, { status: 403 });
    const changesOwnerOnly = parsed.data.isPublished !== undefined || parsed.data.linkPermission !== undefined || parsed.data.allowExport !== undefined || parsed.data.password !== undefined || parsed.data.expiresAt !== undefined || parsed.data.isFavorite !== undefined;
    if (changesOwnerOnly && access !== "OWNER") return NextResponse.json({ error: "Only the Book owner can change sharing or favorites." }, { status: 403 });
    const { password, expiresAt, ...fields } = parsed.data;
    const passwordHash = password === undefined ? undefined : password ? Buffer.from(await bcrypt.hash(password, 12), "utf8") : null;
    const collection = await updateCollection(user.id, params.id, { ...fields, passwordHash, expiresAt: expiresAt === undefined ? undefined : expiresAt ? new Date(expiresAt) : null });
    return NextResponse.json({ collection: safeCollection(collection) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 404 });
  }
});

export const DELETE = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteCollection(user.id, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed." }, { status: 404 });
  }
});
