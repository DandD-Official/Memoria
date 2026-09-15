import { withApiErrorHandling } from "@/lib/api/handler";
import { handleAiGeneration } from "@/lib/ai/generation-route";

/** Backwards-compatible alias for the general generation endpoint. */
export const POST = withApiErrorHandling(handleAiGeneration);
