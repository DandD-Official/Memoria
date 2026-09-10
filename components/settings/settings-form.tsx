"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/theme-provider";
import { useRouter } from "next/navigation";
import { CODE_THEMES, isCodeThemeId, type CodeThemeId } from "@/lib/mmd/code-themes";
import { useCodeTheme } from "@/components/mmd/code-theme-context";

interface Settings {
  appearance: "LIGHT" | "DARK" | "SYSTEM";
  defaultQuestionCount: number;
  defaultDifficulty: "EASY" | "NORMAL" | "HARD" | "MIXED";
  defaultQuizMode: "QUIZ" | "PRACTICE_EXAM" | "MOCK_EXAM" | "TIMED_EXAM" | "MASTERY_TEST";
  showExplanations: boolean;
  autoSave: boolean;
  sidebarMode: "HOVER" | "MANUAL";
  sidebarCollapsed: boolean;
  compactLayout: boolean;
  reduceMotion: boolean;
  codeTheme: CodeThemeId;
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastSavedQuestionCount = useRef(initial.defaultQuestionCount);
  const { theme, setTheme } = useTheme();
  const { codeTheme, setCodeTheme } = useCodeTheme();
  const router = useRouter();

  // The account's stored appearance is the source of truth the first time a
  // signed-in user visits Settings on a given browser (e.g. a fresh device
  // that has no localStorage preference yet). After that, whichever the
  // person picks — here or from the theme toggle anywhere else in the app —
  // wins immediately, both applied client-side and PATCHed to the account.
  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("memora-theme")) {
      setTheme(initial.appearance);
    }
    if (typeof window !== "undefined" && !window.localStorage.getItem("memora-code-theme")) {
      setCodeTheme(isCodeThemeId(initial.codeTheme) ? initial.codeTheme : "memoria-dark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.appearance) setTheme(patch.appearance);
    if (patch.codeTheme) setCodeTheme(patch.codeTheme);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save failed");
      if (patch.defaultQuestionCount !== undefined) lastSavedQuestionCount.current = patch.defaultQuestionCount;
      if (patch.sidebarMode !== undefined || patch.sidebarCollapsed !== undefined || patch.compactLayout !== undefined || patch.reduceMotion !== undefined) router.refresh();
    } catch {
      // Appearance already applied locally even if the account sync fails —
      // don't block or roll back the visual change over a flaky save.
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-5">
      <section id="appearance" className="card scroll-mt-24 p-5">
        <h2 className="font-display text-lg text-ink">Appearance and accessibility</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Control how Memoria looks and reduce visual movement when needed.</p>
        <Label>Color theme</Label>
        <div className="flex gap-2">
          {(["LIGHT", "DARK", "SYSTEM"] as const).map((a) => (
            <button
              key={a}
              onClick={() => save({ appearance: a })}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm capitalize",
                theme === a ? "border-action bg-action text-action-foreground" : "border-line text-ink-soft hover:bg-ink/5"
              )}
            >
              {a.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <Label htmlFor="code-theme">Code block theme</Label>
          <p className="mb-2 mt-1 text-xs text-ink-soft">Choose the colors used by the line-numbered :::code element in previews and exports.</p>
          <select id="code-theme" value={codeTheme} onChange={(event) => save({ codeTheme: event.target.value as CodeThemeId })} className="h-10 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-sm text-ink">
            {Object.entries(CODE_THEMES).map(([value, definition]) => <option key={value} value={value}>{definition.label}</option>)}
          </select>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-ink">
          <input className="mt-0.5 h-4 w-4 accent-accent" type="checkbox" checked={settings.reduceMotion} onChange={(e) => save({ reduceMotion: e.target.checked })} />
          <span><span className="block font-medium">Reduce motion</span><span className="block text-xs text-ink-soft">Minimize animations and transitions throughout the signed-in app.</span></span>
        </label>
      </section>

      <section id="navigation" className="card scroll-mt-24 p-5">
        <h2 className="font-display text-lg text-ink">Navigation and layout</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Choose how the desktop sidebar opens and how much space pages use.</p>
        <Label>Desktop sidebar behavior</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => save({ sidebarMode: "MANUAL" })} className={cn("rounded-lg border p-3 text-left", settings.sidebarMode === "MANUAL" ? "border-action bg-accent-soft" : "border-line hover:bg-ink/5")}><span className="block text-sm font-medium text-ink">Manual button</span><span className="mt-1 block text-xs text-ink-soft">Use the button in the sidebar to open or collapse it.</span></button>
          <button type="button" onClick={() => save({ sidebarMode: "HOVER" })} className={cn("rounded-lg border p-3 text-left", settings.sidebarMode === "HOVER" ? "border-action bg-accent-soft" : "border-line hover:bg-ink/5")}><span className="block text-sm font-medium text-ink">Open on hover</span><span className="mt-1 block text-xs text-ink-soft">Move the pointer to the far-left edge to reveal the sidebar.</span></button>
        </div>
        {settings.sidebarMode === "MANUAL" && <label className="mt-3 flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-ink"><input className="mt-0.5 h-4 w-4 accent-accent" type="checkbox" checked={settings.sidebarCollapsed} onChange={(e) => save({ sidebarCollapsed: e.target.checked })} /><span><span className="block font-medium">Start with sidebar collapsed</span><span className="block text-xs text-ink-soft">Keep only the navigation icons visible until you open it.</span></span></label>}
        <label className="mt-3 flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-ink"><input className="mt-0.5 h-4 w-4 accent-accent" type="checkbox" checked={settings.compactLayout} onChange={(e) => save({ compactLayout: e.target.checked })} /><span><span className="block font-medium">Compact page spacing</span><span className="block text-xs text-ink-soft">Fit more content on screen by reducing vertical page padding.</span></span></label>
      </section>

      <section id="quiz-defaults" className="card scroll-mt-24 p-5">
        <h2 className="font-display text-lg text-ink">Quiz defaults</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Pre-fill new quizzes with your usual test configuration.</p>
        <div className="grid max-w-sm gap-4">
          <div>
            <Label htmlFor="qcount">Default question count</Label>
            <input
              id="qcount"
              type="number"
              min={1}
              max={100}
              value={settings.defaultQuestionCount}
              onChange={(e) => setSettings((current) => ({ ...current, defaultQuestionCount: Number(e.target.value) }))}
              onBlur={(e) => {
                const value = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                setSettings((current) => ({ ...current, defaultQuestionCount: value }));
                if (value !== lastSavedQuestionCount.current) void save({ defaultQuestionCount: value });
              }}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="default-mode">Default test type</Label>
            <select id="default-mode" value={settings.defaultQuizMode} onChange={(e) => save({ defaultQuizMode: e.target.value as Settings["defaultQuizMode"] })} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">
              <option value="QUIZ">Quiz</option><option value="PRACTICE_EXAM">Practice exam</option><option value="MOCK_EXAM">Mock exam</option><option value="TIMED_EXAM">Timed exam</option><option value="MASTERY_TEST">Mastery test</option>
            </select>
          </div>
          <div>
            <Label htmlFor="difficulty">Default difficulty</Label>
            <select
              id="difficulty"
              value={settings.defaultDifficulty}
              onChange={(e) => save({ defaultDifficulty: e.target.value as Settings["defaultDifficulty"] })}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              {["EASY", "NORMAL", "HARD", "MIXED"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section id="study-editing" className="card scroll-mt-24 p-5">
        <h2 className="font-display text-lg text-ink">Study and editing</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">Set feedback and saving behavior for everyday study work.</p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-ink">
            <input className="mt-0.5 h-4 w-4 accent-accent" type="checkbox" checked={settings.showExplanations} onChange={(e) => save({ showExplanations: e.target.checked })} />
            <span><span className="block font-medium">Show answer explanations</span><span className="block text-xs text-ink-soft">Display explanations after checking answers in review mode.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-ink">
            <input className="mt-0.5 h-4 w-4 accent-accent" type="checkbox" checked={settings.autoSave} onChange={(e) => save({ autoSave: e.target.checked })} />
            <span><span className="block font-medium">Auto-save edits</span><span className="block text-xs text-ink-soft">Save notes and reviewers while you type to reduce the risk of lost work.</span></span>
          </label>
        </div>
      </section>

      <p className="min-h-4 text-xs text-ink-faint" role="status">{saving ? "Saving…" : saved ? "Saved." : ""}</p>
    </div>
  );
}
