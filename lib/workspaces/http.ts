import { NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/handler";
import { WorkspaceError } from "./repository";

export function workspaceRoute<Args extends unknown[]>(handler: (request: Request, ...args: Args) => Promise<NextResponse>) {
  return withApiErrorHandling(async (request: Request, ...args: Args) => {
    try {
      const response = await handler(request, ...args);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof WorkspaceError) return NextResponse.json({ error: error.message, ...error.details }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
      throw error;
    }
  });
}
