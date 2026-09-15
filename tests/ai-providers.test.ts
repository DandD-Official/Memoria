import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithProvider } from "@/lib/ai/providers";
import { generateWithFallback } from "@/lib/ai/generation";
import { getSystemAiConnections } from "@/lib/ai/system";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI provider adapters", () => {
  it("uses the non-storing Responses API for OpenAI", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "quiz json" }] }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", model: "gpt-test", prompt: "Generate a sufficiently long quiz prompt." })).resolves.toBe("quiz json");
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ store: false, model: "gpt-test" });
    expect(init.headers.Authorization).toBe("Bearer secret");
  });

  it("uses an OpenAI-compatible chat endpoint when a gateway base URL is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "gateway response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", model: "gpt-4o-mini", baseUrl: "https://api.aimlapi.com/v1/", prompt: "Generate a sufficiently long response." })).resolves.toBe("gateway response");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.aimlapi.com/v1/chat/completions");
    expect(JSON.parse(init.body)).toMatchObject({ model: "gpt-4o-mini", messages: [{ role: "user" }], max_tokens: 8192 });
  });

  it("parses Anthropic text blocks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "reviewer" }] }), { status: 200 })));
    await expect(generateWithProvider({ provider: "ANTHROPIC", apiKey: "secret", prompt: "Generate a sufficiently long reviewer prompt." })).resolves.toBe("reviewer");
  });

  it("parses Gemini candidate parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "cards" }] } }] }), { status: 200 })));
    await expect(generateWithProvider({ provider: "GEMINI", apiKey: "secret", prompt: "Generate sufficiently detailed flashcards." })).resolves.toBe("cards");
  });

  it("does not leak provider error response bodies beyond their message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 })));
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", prompt: "Generate a sufficiently long quiz prompt." })).rejects.toThrow("Invalid API key");
  });

  it("retries temporary provider capacity failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "This model is currently experiencing high demand." } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ output_text: "reviewer" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateWithProvider({ provider: "OPENAI", apiKey: "secret", prompt: "Generate a sufficiently long reviewer prompt." })).resolves.toBe("reviewer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls through to the next configured key after a provider failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ output_text: "fallback response" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateWithFallback([
      { source: "system", provider: "OPENAI", apiKey: "bad-key", model: "gpt-test" },
      { source: "system", provider: "OPENAI", apiKey: "good-key", model: "gpt-test" },
    ], "Generate a sufficiently long response.")).resolves.toMatchObject({ text: "fallback response" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("parses multiple system keys in deployment order", () => {
    vi.stubEnv("AI_SYSTEM_PROVIDER", "OPENAI");
    vi.stubEnv("AI_SYSTEM_MODEL", "gpt-system");
    vi.stubEnv("AI_SYSTEM_API_KEYS", "primary\nbackup,emergency");
    vi.stubEnv("AI_SYSTEM_BASE_URL", "https://api.aimlapi.com/v1");

    expect(getSystemAiConnections()).toEqual([
      { source: "system", provider: "OPENAI", apiKey: "primary", model: "gpt-system", baseUrl: "https://api.aimlapi.com/v1" },
      { source: "system", provider: "OPENAI", apiKey: "backup", model: "gpt-system", baseUrl: "https://api.aimlapi.com/v1" },
      { source: "system", provider: "OPENAI", apiKey: "emergency", model: "gpt-system", baseUrl: "https://api.aimlapi.com/v1" },
    ]);
  });

  it("uses the gateway-safe model when its model is omitted", () => {
    vi.stubEnv("AI_SYSTEM_PROVIDER", "OPENAI");
    vi.stubEnv("AI_SYSTEM_BASE_URL", "https://api.aimlapi.com/v1");
    vi.stubEnv("AI_SYSTEM_API_KEYS", "primary");

    expect(getSystemAiConnections()).toEqual([
      { source: "system", provider: "OPENAI", apiKey: "primary", model: "gpt-4o-mini", baseUrl: "https://api.aimlapi.com/v1" },
    ]);
  });
});
