import { AiProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithFallback, isBusyProviderMessage, type AiGenerationCandidate } from "@/lib/ai/generation";
import { getSystemAiConnections } from "@/lib/ai/system";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/integrations/crypto";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const MAX_PUBLIC_PROMPT_CHARS = 60_000;
const schema = z.object({
  provider: z.nativeEnum(AiProvider).optional(),
  prompt: z.string().min(20).max(250_000),
  source: z.enum(["system", "personal", "auto"]).default("auto"),
});

export const handleAiGeneration = async (request: Request) => {
  const user = await requireUserOrNull();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  if (!user && parsed.data.prompt.length > MAX_PUBLIC_PROMPT_CHARS) {
    return NextResponse.json({ error: "Public generation prompts must be 60,000 characters or shorter." }, { status: 413 });
  }
  if (!user && parsed.data.source === "personal") {
    return NextResponse.json({ error: "Sign in to use your own AI provider key.", code: "PERSONAL_AI_REQUIRES_AUTH" }, { status: 401 });
  }

  const rateKey = user ? `ai:${user.id}` : `ai:public:${getClientIp(request.headers)}`;
  const rateLimit = user
    ? await isRateLimited(rateKey, 12, 60_000)
    : await isRateLimited(rateKey, 8, 60_000);
  if (rateLimit) return NextResponse.json({ error: "Too many AI requests. Try again in a minute." }, { status: 429 });

  const personalConnections = user && parsed.data.source !== "system"
    ? await prisma.aiConnection.findMany({
      where: { userId: user.id, ...(parsed.data.provider ? { provider: parsed.data.provider } : {}) },
      orderBy: { updatedAt: "desc" },
    })
    : [];
  const personalCandidates: AiGenerationCandidate[] = [];
  let invalidPersonalConnections = 0;
  for (const connection of personalConnections) {
    try {
      personalCandidates.push({
        source: "personal",
        provider: connection.provider,
        apiKey: decryptToken(connection.apiKey),
        model: connection.model,
      });
    } catch {
      invalidPersonalConnections += 1;
    }
  }

  const systemCandidates = parsed.data.source !== "personal"
    ? getSystemAiConnections(parsed.data.provider)
    : [];
  const candidates = parsed.data.source === "system"
    ? systemCandidates
    : parsed.data.source === "personal"
      ? personalCandidates
      : user
        ? [...personalCandidates, ...systemCandidates]
        : systemCandidates;

  if (candidates.length === 0) {
    if (parsed.data.source === "system" || !user) {
      return NextResponse.json({ error: "System AI generation is not configured yet.", code: "AI_SYSTEM_NOT_CONFIGURED" }, { status: 503 });
    }
    if ((parsed.data.source === "personal" || parsed.data.source === "auto") && personalConnections.length > 0 && invalidPersonalConnections === personalConnections.length && systemCandidates.length === 0) {
      return NextResponse.json(
        { error: "Your saved AI provider connections can no longer be unlocked. Reconnect a provider in Settings → AI providers.", code: "AI_CONNECTION_INVALID" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Connect an AI provider in Settings first.", code: "NO_AI_CONNECTION" }, { status: 409 });
  }

  try {
    const result = await generateWithFallback(candidates, parsed.data.prompt);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    const sawBusyProvider = isBusyProviderMessage(message) || (error as { sawBusyProvider?: boolean }).sawBusyProvider;
    if (sawBusyProvider) {
      return NextResponse.json(
        { error: "All selected AI keys are temporarily at capacity. Memoria tried each key; try again in a moment.", code: "AI_PROVIDER_BUSY" },
        { status: 503, headers: { "Retry-After": "4" } },
      );
    }
    if (parsed.data.source === "system" || !user) {
      return NextResponse.json({ error: `System AI request failed: ${message}`, code: "AI_SYSTEM_UNAVAILABLE" }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
