"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Check, Cloud, KeyRound, Palette, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useTheme, type Appearance } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Profile", icon: User },
  { label: "Connections", icon: Cloud },
  { label: "AI", icon: KeyRound },
  { label: "Preferences", icon: Palette },
];

type Difficulty = "EASY" | "NORMAL" | "HARD" | "MIXED";
type QuizMode = "QUIZ" | "PRACTICE_EXAM" | "MOCK_EXAM" | "TIMED_EXAM" | "MASTERY_TEST";

interface OnboardingFlowProps {
  initialName: string;
  email: string;
  configuredProviders: { google: boolean; notion: boolean };
}

export function OnboardingFlow({ initialName, email, configuredProviders }: OnboardingFlowProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [provider, setProvider] = useState<"OPENAI" | "ANTHROPIC" | "GEMINI">("OPENAI");
  const [apiKey, setApiKey] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("MIXED");
  const [quizMode, setQuizMode] = useState<QuizMode>("QUIZ");
  const [showExplanations, setShowExplanations] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveStep(stepIndex: number) {
    const trimmedName = name.trim();

    if (stepIndex === 0 && trimmedName && trimmedName !== initialName) {
      await checkedFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
    }

    if (stepIndex === 2 && apiKey.trim()) {
      await checkedFetch("/api/ai/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });
      setApiKey("");
    }

    if (stepIndex === 3) {
      await checkedFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appearance: theme,
          defaultQuestionCount: questionCount,
          defaultDifficulty: difficulty,
          defaultQuizMode: quizMode,
          showExplanations,
          autoSave,
        }),
      });
    }
  }

  async function saveCurrent() {
    setBusy(true);
    setError(null);
    try {
      await saveStep(step);
      setStep((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save this step.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(saveDraft: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (saveDraft) {
        // Tabs can be visited in any order, so save every draft before finishing.
        await saveStep(0);
        await saveStep(2);
        await saveStep(3);
      }
      await checkedFetch("/api/onboarding", { method: "POST" });
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't finish setup.");
    } finally {
      setBusy(false);
    }
  }

  function selectStep(index: number) {
    if (busy) return;
    setError(null);
    setStep(index);
  }

  const StepIcon = steps[step].icon;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-center gap-2 font-display text-xl text-ink">
          <BookMarked className="h-5 w-5 text-accent-dark" /> Memoria
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-ink/[0.02] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-accent-dark">Welcome to Memoria</p>
            <h1 className="mt-1 font-display text-2xl text-ink">Make the workspace yours</h1>
            <p className="mt-1 text-sm text-ink-soft">Every step is optional. You can change any of this later in Settings.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Onboarding steps">
              {steps.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => selectStep(index)}
                  disabled={busy}
                  aria-current={index === step ? "step" : undefined}
                  className={cn(
                    "rounded-lg border p-2 text-center text-xs transition-colors hover:border-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60",
                    index === step
                      ? "border-accent bg-accent-soft/30 text-ink"
                      : index < step
                        ? "border-success/30 text-success"
                        : "border-line text-ink-faint",
                  )}
                >
                  <item.icon className="mx-auto mb-1 h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <StepIcon className="h-5 w-5 text-accent-dark" />
              <h2 className="font-display text-lg text-ink">{steps[step].label}</h2>
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="setup-name">Display name</Label>
                  <Input id="setup-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={email} readOnly className="opacity-70" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-sm text-ink-soft">Connect your own accounts. Memoria never shares these connections with other users.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ConnectionOption provider="Google Drive" href="/api/integrations/google/connect" configured={configuredProviders.google} />
                  <ConnectionOption provider="Notion" href="/api/integrations/notion/connect" configured={configuredProviders.notion} />
                </div>
                {(!configuredProviders.google || !configuredProviders.notion) && (
                  <p className="mt-3 rounded-lg border border-line bg-ink/[0.02] p-3 text-xs text-ink-soft">
                    Unavailable connections need valid OAuth credentials from the app administrator. You can safely skip this step and connect them later in Settings.
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">Optionally add your own AI key. It is encrypted and belongs only to your account.</p>
                <div>
                  <Label htmlFor="setup-provider">Provider</Label>
                  <select id="setup-provider" value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                    <option value="OPENAI">OpenAI</option>
                    <option value="ANTHROPIC">Anthropic</option>
                    <option value="GEMINI">Gemini</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="setup-key">API key</Label>
                  <Input id="setup-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Leave blank to skip" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <Label>Theme</Label>
                  <div className="mt-2 flex gap-2">
                    {(["LIGHT", "DARK", "SYSTEM"] as Appearance[]).map((value) => (
                      <button key={value} type="button" onClick={() => setTheme(value)} className={cn("rounded-lg border px-3 py-2 text-sm", theme === value ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft")}>
                        {value.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="setup-count">Default quiz questions</Label>
                    <Input id="setup-count" type="number" min={1} max={100} value={questionCount} onChange={(event) => setQuestionCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} />
                  </div>
                  <div>
                    <Label htmlFor="setup-mode">Default test type</Label>
                    <select id="setup-mode" value={quizMode} onChange={(event) => setQuizMode(event.target.value as QuizMode)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                      <option value="QUIZ">Quiz</option>
                      <option value="PRACTICE_EXAM">Practice exam</option>
                      <option value="MOCK_EXAM">Mock exam</option>
                      <option value="TIMED_EXAM">Timed exam</option>
                      <option value="MASTERY_TEST">Mastery test</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="setup-difficulty">Default difficulty</Label>
                    <select id="setup-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                      <option value="MIXED">Mixed</option>
                      <option value="EASY">Easy</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-line bg-ink/[0.02] p-4">
                  <label className="flex items-start gap-3 text-sm text-ink">
                    <input className="mt-0.5" type="checkbox" checked={showExplanations} onChange={(event) => setShowExplanations(event.target.checked)} />
                    <span>Show answer explanations during review sessions</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-ink">
                    <input className="mt-0.5" type="checkbox" checked={autoSave} onChange={(event) => setAutoSave(event.target.checked)} />
                    <span>Auto-save notes and reviewers while editing</span>
                  </label>
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="mt-7 flex items-center justify-between">
              <button type="button" disabled={busy} onClick={() => (step === 0 ? void finish(false) : selectStep(step - 1))} className="text-sm text-ink-soft hover:text-ink disabled:opacity-60">
                {step === 0 ? "Skip setup" : "Back"}
              </button>
              <div className="flex gap-2">
                {step < steps.length - 1 && (
                  <Button variant="ghost" disabled={busy} onClick={() => selectStep(step + 1)}>
                    Skip this step
                  </Button>
                )}
                <Button onClick={() => (step === steps.length - 1 ? void finish(true) : void saveCurrent())} loading={busy}>
                  {step === steps.length - 1 ? (
                    <>
                      <Check className="h-4 w-4" /> Finish
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ConnectionOption({ provider, href, configured }: { provider: string; href: string; configured: boolean }) {
  if (!configured) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed rounded-lg border border-line bg-ink/[0.02] p-4 text-sm font-medium text-ink-faint">
        Connect {provider}
        <span className="mt-1 block text-xs font-normal">Temporarily unavailable</span>
      </div>
    );
  }

  return (
    <a target="_blank" rel="noreferrer" href={href} className="rounded-lg border border-line p-4 text-sm font-medium text-ink hover:border-accent">
      Connect {provider}
      <span className="mt-1 block text-xs font-normal text-ink-soft">Optional · opens {provider} OAuth</span>
    </a>
  );
}

async function checkedFetch(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Couldn't save your settings.");
  return data;
}
