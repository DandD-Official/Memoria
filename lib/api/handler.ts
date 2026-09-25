import { ConnectionExpiredError } from "@/lib/integrations/repository";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";

export type RouteContext<Params extends Record<string, string>> = {
  params: Promise<Params>;
};

/**
 * Wraps a route handler so an unexpected exception (a bad Prisma query, a
 * thrown error deep in a repo function, etc.) can never escape as Next.js's
 * default HTML error page.
 *
 * Why this matters: the client always does `await res.json()` on API
 * responses. If the server throws before sending a body, Next.js renders an
 * HTML error page instead of JSON, `res.json()` then throws on the client,
 * and every fetch call in this app reports that in its `catch` block as
 * "We couldn't reach the server" — even though the server *was* reached and
 * the request *did* fail server-side. That misleading message is what made
 * intermittent failures look like connectivity problems. Every route below
 * is wrapped with this so failures always come back as real, readable JSON
 * error messages instead.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<NextResponse>
) {
  return async (request: Request, ...args: Args): Promise<NextResponse> => {
    const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
    try {
      const response = await handler(request, ...args);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      // Preserve Next.js control-flow signals (dynamic rendering, redirects,
      // notFound) instead of disguising them as application 500 responses.
      unstable_rethrow(err);
      if (err instanceof ConnectionExpiredError) return NextResponse.json({ error: err.message }, { status: 409 });
      console.error(`[api:${requestId}] unhandled error:`, err);
      const response = NextResponse.json(
        { error: "Something went wrong on our end. Please try again in a moment.", requestId },
        { status: 500 }
      );
      response.headers.set("x-request-id", requestId);
      return response;
    }
  };
}
