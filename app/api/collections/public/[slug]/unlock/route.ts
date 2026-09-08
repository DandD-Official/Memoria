import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { collectionAccessCookieName, collectionAccessToken } from "@/lib/collections/access";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ slug: string }>) => {
  const { slug } = await context.params;
  if (await isRateLimited(`collection-unlock:${slug}:${getClientIp(request.headers)}`, 10, 15 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const password = (await request.json().catch(() => null))?.password;
  if (typeof password !== "string") return NextResponse.json({ error: "Enter the Book password." }, { status: 400 });
  const collection = await prisma.shareCollection.findUnique({ where: { slug }, select: { passwordHash: true, isPublished: true, expiresAt: true } });
  if (!collection || !collection.isPublished || (collection.expiresAt && collection.expiresAt <= new Date())) return NextResponse.json({ error: "Book not found." }, { status: 404 });
  if (collection.passwordHash && !(await bcrypt.compare(password, Buffer.from(collection.passwordHash).toString("utf8")))) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(collectionAccessCookieName(slug), collectionAccessToken(slug), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 24 * 60 * 60 });
  return response;
});
