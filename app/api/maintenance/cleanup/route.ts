import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const staleBucketCutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const [tokens, buckets, notifications, invites, workspaces] = await prisma.$transaction([
    prisma.accountToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null }, createdAt: { lt: staleBucketCutoff } }] } }),
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: staleBucketCutoff } } }),
    prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60_000) } } }),
    prisma.resourceInvite.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.workspace.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  return NextResponse.json({ deleted: { tokens: tokens.count, rateLimitBuckets: buckets.count, notifications: notifications.count, invites: invites.count, workspaces: workspaces.count } });
}

// Vercel Cron calls GET and supplies the CRON_SECRET bearer token.
export const GET = POST;
