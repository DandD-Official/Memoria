import type { AiProvider } from "@prisma/client";

const REQUEST_TIMEOUT_MS = 90_000;
const RETRY_DELAYS_MS = [250, 750];

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  OPENAI: "gpt-5-mini",
  ANTHROPIC: "claude-haiku-4-5",
  GEMINI: "gemini-3.7-flash",
};

class ProviderRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

function isRetryableProviderError(status: number, message: string): boolean {
  return [408, 409, 425, 429, 500, 502, 503, 504, 529].includes(status) || /high demand|overload|capacity|temporarily unavailable|try again later/i.test(message);
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
      if (response.ok) return payload;

      const message = payload?.error?.message || payload?.message || `The AI provider returned ${response.status}.`;
      if (!isRetryableProviderError(response.status, message) || attempt === RETRY_DELAYS_MS.length) {
        throw new ProviderRequestError(message, response.status);
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : RETRY_DELAYS_MS[attempt];
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;
      if (attempt === RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw new Error("The AI provider request could not be completed.");
}

function openAiText(payload: unknown): string {
  const data = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (data.output_text) return data.output_text;
  return data.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("") ?? "";
}

function chatCompletionText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: { content?: string | Array<{ text?: string }> };
    }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return content?.map((part) => part.text ?? "").join("") ?? "";
}

function providerEndpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path}`;
}

export async function generateWithProvider(input: {
  provider: AiProvider;
  apiKey: string;
  model?: string | null;
  prompt: string;
  /** Optional OpenAI-compatible base URL, used by shared gateway providers. */
  baseUrl?: string | null;
}): Promise<string> {
  const model = input.model?.trim() || DEFAULT_AI_MODELS[input.provider];
  let payload: unknown;

  if (input.provider === "OPENAI") {
    const baseUrl = input.baseUrl?.trim();
    payload = await requestJson(
      baseUrl ? providerEndpoint(baseUrl, "chat/completions") : "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(baseUrl
          ? { model, messages: [{ role: "user", content: input.prompt }], max_tokens: 8192 }
          : { model, input: input.prompt, store: false }),
      },
    );
    const text = baseUrl ? chatCompletionText(payload) : openAiText(payload);
    if (text) return text;
  }

  if (input.provider === "ANTHROPIC") {
    payload = await requestJson("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: "user", content: input.prompt }] }),
    });
    const text = (payload as { content?: Array<{ type?: string; text?: string }> }).content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("") ?? "";
    if (text) return text;
  }

  if (input.provider === "GEMINI") {
    payload = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: input.prompt }] }] }),
    });
    const text = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text ?? "").join("") ?? "";
    if (text) return text;
  }

  throw new Error("The provider returned an empty response.");
}
