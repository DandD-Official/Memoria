import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { createMedia } from "@/lib/media/repo";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]);

function safeSvg(bytes: Buffer): boolean {
  const text = bytes.toString("utf8");
  return !/<script\b|on[a-z]+\s*=|javascript:|<foreignObject\b/i.test(text);
}

export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an SVG or image file." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only SVG, PNG, JPEG, and WebP files are supported." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Visual files must be 5 MB or smaller." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "image/svg+xml" && !safeSvg(bytes)) return NextResponse.json({ error: "This SVG contains executable or embedded HTML content." }, { status: 400 });
  const media = await createMedia({ ownerId: user.id, bytes, mimeType: file.type, kind: "UPLOADED" });
  return NextResponse.json({ mediaId: media.id, src: `media://${media.id}`, mimeType: file.type }, { status: 201 });
});
