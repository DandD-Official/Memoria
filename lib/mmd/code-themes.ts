export const CODE_THEME_IDS = ["memoria-dark", "github-light", "dracula", "solarized-light"] as const;

export type CodeThemeId = (typeof CODE_THEME_IDS)[number];

export interface CodeTheme {
  label: string;
  background: string;
  foreground: string;
  gutter: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  type: string;
  operator: string;
}

export const CODE_THEMES: Record<CodeThemeId, CodeTheme> = {
  "memoria-dark": {
    label: "Memoria dark",
    background: "#1b1f3b",
    foreground: "#f7f4ed",
    gutter: "#858ba8",
    keyword: "#f2aa36",
    string: "#b8df9b",
    comment: "#9aa0bd",
    number: "#8dd6ff",
    function: "#f7d794",
    type: "#d7aefb",
    operator: "#f7f4ed",
  },
  "github-light": {
    label: "GitHub light",
    background: "#f6f8fa",
    foreground: "#24292f",
    gutter: "#8c959f",
    keyword: "#cf222e",
    string: "#0a3069",
    comment: "#6e7781",
    number: "#0550ae",
    function: "#8250df",
    type: "#953800",
    operator: "#24292f",
  },
  dracula: {
    label: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    gutter: "#6272a4",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    comment: "#6272a4",
    number: "#bd93f9",
    function: "#50fa7b",
    type: "#8be9fd",
    operator: "#ff79c6",
  },
  "solarized-light": {
    label: "Solarized light",
    background: "#fdf6e3",
    foreground: "#586e75",
    gutter: "#93a1a1",
    keyword: "#859900",
    string: "#2aa198",
    comment: "#93a1a1",
    number: "#d33682",
    function: "#268bd2",
    type: "#b58900",
    operator: "#586e75",
  },
};

export function isCodeThemeId(value: string): value is CodeThemeId {
  return (CODE_THEME_IDS as readonly string[]).includes(value);
}

export function getStoredCodeTheme(): CodeThemeId {
  if (typeof window === "undefined") return "memoria-dark";
  const stored = window.localStorage.getItem("memora-code-theme");
  return stored && isCodeThemeId(stored) ? stored : "memoria-dark";
}
