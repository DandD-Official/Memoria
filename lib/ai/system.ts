import { AiProvider } from "@prisma/client";
import { DEFAULT_AI_MODELS } from "@/lib/ai/providers";

/**
 * Reads the app-owned AI pool without ever exposing the values to the client.
 * AI_SYSTEM_API_KEYS accepts comma- or newline-separated keys so deployments
 * can keep a primary key and one or more fallbacks in a single secret.
 */
export function getSystemAiConnections(provider?: AiProvider) {
  const configuredProvider = parseProvider(process.env.AI_SYSTEM_PROVIDER);
  const selectedProvider = provider ?? configuredProvider;
  if (!selectedProvider || (provider && provider !== configuredProvider)) return [];

  const rawKeys = process.env.AI_SYSTEM_API_KEYS || process.env.AI_SYSTEM_API_KEY || "";
  const keys = rawKeys
    .split(/[\r\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);
  const baseUrl = process.env.AI_SYSTEM_BASE_URL?.trim();
  const defaultModel = baseUrl ? "gpt-4o-mini" : DEFAULT_AI_MODELS[selectedProvider];

  return keys.map((apiKey) => ({
    source: "system" as const,
    provider: selectedProvider,
    apiKey,
    model: process.env.AI_SYSTEM_MODEL?.trim() || defaultModel,
    ...(baseUrl ? { baseUrl } : {}),
  }));
}

export function hasSystemAiConnection(): boolean {
  return getSystemAiConnections().length > 0;
}

function parseProvider(value: string | undefined): AiProvider | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && Object.values(AiProvider).includes(normalized as AiProvider)
    ? normalized as AiProvider
    : null;
}
