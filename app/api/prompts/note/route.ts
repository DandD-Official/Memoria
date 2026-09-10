import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { buildNoteReformatPrompt, buildSourcePackage, type ProcessingStyle } from "@/lib/prompts/note-prompt";
import { findNotesByIds } from "@/lib/notes-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

const VALID_STYLES: ProcessingStyle[] = ["preserve", "balanced", "condensed", "exam_focused", "visual_creative"];

// POST { noteIds: string[], style: ProcessingStyle, mode: "prompt" | "package" }
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const noteIds: string[] = body?.noteIds ?? [];
  const style: ProcessingStyle = VALID_STYLES.includes(body?.style) ? body.style : "balanced";
  const mode: "prompt" | "package" = body?.mode === "package" ? "package" : "prompt";

  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return NextResponse.json({ error: "Select at least one note." }, { status: 400 });
  }

  for (const id of noteIds) {
    const allowed = await canView(user.id, "NOTE", id);
    if (!allowed) return NextResponse.json({ error: "One or more notes could not be found." }, { status: 404 });
  }

  const notes = await findNotesByIds(noteIds);
  if (notes.length === 0) return NextResponse.json({ error: "No matching notes found." }, { status: 404 });

  if (mode === "package") {
    const text = buildSourcePackage(notes, style);
    return NextResponse.json({ text, filename: "memoria-source.txt" });
  }

  const text = buildNoteReformatPrompt(notes, style);
  return NextResponse.json({ text });
});
