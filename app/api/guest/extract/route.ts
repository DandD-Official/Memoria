import { NextResponse } from "next/server";
import { extractTextFromFile, FileParseError } from "@/lib/imports/file-parser";
import { guestRateLimit } from "@/lib/guest-rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";

// Extracts text from an uploaded .md/.txt/.pdf/.docx/.pptx/.json file without
// persisting anything — used by guest mode so people without an account can
// still get their notes into a prompt. Nothing here touches the database.
export const POST = withApiErrorHandling(async (request: Request) => {
  const limited = await guestRateLimit(request);
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  try {
    const { text, title, hasImages } = await extractTextFromFile(file);
    return NextResponse.json({
      text,
      title: title || file.name.replace(/\.[^/.]+$/, ""),
      notice: hasImages
        ? "This file contained images or embedded visuals. Memoria imports the written content, but those visuals were skipped."
        : undefined,
    });
  } catch (err) {
    if (err instanceof FileParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
});
