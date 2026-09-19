import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { emptyLibraryResults, searchLibrary } from "@/lib/library-search";

// Keep all groups owner-scoped, including recommendations and unpublished books.
export const GET = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const recommended = searchParams.get("recommended") === "1";
  if (!query && !recommended) return NextResponse.json(emptyLibraryResults());

  const results = await searchLibrary(user.id, query, query ? 5 : 4);
  return NextResponse.json({ ...results, ...(!query ? { recommended: true } : {}) });
});
