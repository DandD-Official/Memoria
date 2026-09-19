"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Appearance = "LIGHT" | "DARK" | "SYSTEM";

const STORAGE_KEY = "memora-theme";

interface ThemeContextValue {
  /** The user's stored preference — may be SYSTEM. */
  theme: Appearance;
  /** LIGHT or DARK — SYSTEM resolved against the OS preference. What's actually applied. */
  resolvedTheme: "LIGHT" | "DARK";
  setTheme: (theme: Appearance) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Appearance {
  if (typeof window === "undefined") return "SYSTEM";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "LIGHT" || stored === "DARK" || stored === "SYSTEM" ? stored : "SYSTEM";
  } catch { return "SYSTEM"; }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(resolved: "LIGHT" | "DARK") {
  if (document.documentElement.classList.contains("dark") === (resolved === "DARK")) return;
  const suppressTransitions = document.createElement("style");
  suppressTransitions.textContent = "*,*::before,*::after{transition:none !important}";
  document.head.appendChild(suppressTransitions);
  document.documentElement.classList.toggle("dark", resolved === "DARK");
  // Apply the new palette together before restoring interaction transitions.
  void window.getComputedStyle(document.body).backgroundColor;
  window.requestAnimationFrame(() => suppressTransitions.remove());
}

/**
 * Theme is intentionally stored in the browser (localStorage), not only on
 * the account, so appearance can be changed and takes effect immediately
 * whether or not anyone is signed in. When a signed-in user changes it from
 * Settings, we additionally PATCH /api/settings so the preference follows
 * their account across devices — see components/settings/settings-form.tsx.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Appearance>("SYSTEM");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setSystemDark(systemPrefersDark());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "LIGHT" | "DARK" = theme === "SYSTEM" ? (systemDark ? "DARK" : "LIGHT") : theme;

  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Appearance) => {
    setThemeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* The theme still works for this visit. */ }
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/**
 * Inline, blocking script — stringified into a <script> tag in app/layout.tsx
 * before React hydrates. Reads localStorage synchronously and applies the
 * `dark` class before first paint, so there's no flash of the wrong theme.
 * Kept in sync with readStoredTheme/systemPrefersDark/applyThemeClass above.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    var theme = stored === "LIGHT" || stored === "DARK" || stored === "SYSTEM" ? stored : "SYSTEM";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = theme === "SYSTEM" ? (systemDark ? "DARK" : "LIGHT") : theme;
    if (resolved === "DARK") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
