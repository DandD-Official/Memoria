import { prisma } from "@/lib/db";

export async function createMedia(input: { ownerId: string; bytes: Buffer; mimeType: string; kind?: "UPLOADED" }) {
  return prisma.media.create({ data: { ownerId: input.ownerId, data: input.bytes, mimeType: input.mimeType, kind: input.kind ?? "UPLOADED" } });
}

export async function findMedia(id: string, ownerId: string) {
  return prisma.media.findFirst({ where: { id, ownerId }, select: { data: true, mimeType: true } });
}
