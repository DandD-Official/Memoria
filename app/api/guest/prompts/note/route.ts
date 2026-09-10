import { NextResponse } from "next/server";
import { z } from "zod";
import { buildNoteReformatPrompt, type ProcessingStyle } from "@/lib/prompts/note-prompt";
import { guestRateLimit } from "@/lib/guest-rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";

const VALID_STYLES: ProcessingStyle[] = ["preserve", "balanced", "condensed", "exam_focused", "visual_creative"];

// Guest content is capped well below the authenticated path's practical
// limits — this endpoint is unauthenticated, so it needs its own guardrail
// against someone using it to generate huge prompts for free at scale.
const MAX_GUEST_CONTENT_CHARS = 60_000;

const bodySchema = z.object({
  title: z.string().min(1).max(200).default("My notes"),
  content: z.string().min(1).max(MAX_GUEST_CONTENT_CHARS),
  style: z.enum(["preserve", "balanced", "condensed", "exam_focused", "visual_creative"]).default("balanced"),
});

// Nothing here touches the database and no session is required — this is
// the "quick mode" path described in the guest-mode UI: generate a prompt
// from pasted text only, with nothing persisted server-side.
export const POST = withApiErrorHandling(async (request: Request) => {
  const limited = await guestRateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const style = VALID_STYLES.includes(parsed.data.style) ? parsed.data.style : "balanced";
  const text = buildNoteReformatPrompt([{ title: parsed.data.title, content: parsed.data.content }], style);

  return NextResponse.json({ text });
});
