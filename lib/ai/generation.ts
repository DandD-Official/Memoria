import type { AiProvider } from "@prisma/client";
import { generateWithProvider } from "@/lib/ai/providers";

export type AiKeySource = "system" | "personal";

export type AiGenerationCandidate = {
  source: AiKeySource;
  provider: AiProvider;
  apiKey: string;
  model?: string | null;
  baseUrl?: string | null;
};

export type AiGenerationResult = {
  text: string;
  source: AiKeySource;
  provider: AiProvider;
  model: string | null | undefined;
};

export class AiGenerationError extends Error {
  constructor(
    message: string,
    readonly sawBusyProvider: boolean,
  ) {
    super(message);
    this.name = "AiGenerationError";
  }
}

export function isBusyProviderMessage(message: string): boolean {
  return /high demand|overload|capacity|temporarily unavailable|try again later|returned 429|returned 503/i.test(message);
}

/** Tries candidates in their supplied order and stops at the first response. */
export async function generateWithFallback(
  candidates: AiGenerationCandidate[],
  prompt: string,
): Promise<AiGenerationResult> {
  let lastError = "AI generation failed.";
  let sawBusyProvider = false;

  for (const candidate of candidates) {
    try {
      const text = await generateWithProvider({
        provider: candidate.provider,
        apiKey: candidate.apiKey,
        model: candidate.model,
        prompt,
        baseUrl: candidate.baseUrl,
      });
      return {
        text,
        source: candidate.source,
        provider: candidate.provider,
        model: candidate.model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI generation failed.";
      lastError = message.replaceAll(candidate.apiKey, "[redacted]").slice(0, 500);
      sawBusyProvider ||= isBusyProviderMessage(message);
    }
  }

  throw new AiGenerationError(lastError, sawBusyProvider);
}
