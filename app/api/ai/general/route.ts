import { withApiErrorHandling } from "@/lib/api/handler";
import { handleAiGeneration } from "@/lib/ai/generation-route";

/** Public general-purpose generation endpoint. System keys are available to everyone. */
export const POST = withApiErrorHandling(handleAiGeneration);
