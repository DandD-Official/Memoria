import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { withApiErrorHandling } from "@/lib/api/handler";
import { CODE_THEME_IDS } from "@/lib/mmd/code-themes";

const updateSettingsSchema = z.object({
  appearance: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  defaultQuestionCount: z.number().int().positive().max(100).optional(),
  defaultDifficulty: z.enum(["EASY", "NORMAL", "HARD", "MIXED"]).optional(),
  defaultQuizMode: z.enum(["QUIZ", "PRACTICE_EXAM", "MOCK_EXAM", "TIMED_EXAM", "MASTERY_TEST"]).optional(),
  showExplanations: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  sidebarMode: z.enum(["HOVER", "MANUAL"]).optional(),
  sidebarCollapsed: z.boolean().optional(),
  compactLayout: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  codeTheme: z.enum(CODE_THEME_IDS).optional(),
});

export const GET = withApiErrorHandling(async () => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return NextResponse.json({ settings });
});

export const PATCH = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: { userId: user.id, ...parsed.data },
  });

  return NextResponse.json({ settings });
});
