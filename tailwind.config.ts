import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Every token below reads from a CSS variable (defined in
        // app/globals.css for :root and .dark) instead of a fixed hex, so
        // toggling the `dark` class on <html> re-themes the whole app
        // without touching component classes like `bg-surface`/`text-ink`.
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
          dark: "rgb(var(--color-accent-dark) / <alpha-value>)",
        },
        action: {
          DEFAULT: "rgb(var(--color-action) / <alpha-value>)",
          foreground: "rgb(var(--color-action-foreground) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-line) / <alpha-value>)",
          strong: "rgb(var(--color-line-strong) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
          raised: "rgb(var(--color-surface-raised) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        memory: {
          DEFAULT: "rgb(var(--color-memory) / <alpha-value>)",
          soft: "rgb(var(--color-memory-soft) / <alpha-value>)",
        },
        book: {
          DEFAULT: "rgb(var(--color-book) / <alpha-value>)",
          soft: "rgb(var(--color-book-soft) / <alpha-value>)",
        },
        dark: {
          bg: "#12141F",
          surface: "#1A1D2B",
          line: "#2A2E42",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-lg": ["clamp(2rem, 4vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.25rem)", { lineHeight: "1.12", letterSpacing: "-0.02em" }],
        title: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        body: ["0.9375rem", { lineHeight: "1.65" }],
        caption: ["0.75rem", { lineHeight: "1.5" }],
      },
      spacing: {
        page: "clamp(1rem, 3vw, 2rem)",
        section: "1.5rem",
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-surface)",
        panel: "var(--radius-panel)",
      },
      boxShadow: {
        card: "var(--elevation-surface)",
        "card-hover": "var(--elevation-raised)",
        dialog: "var(--elevation-dialog)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "highlight-sweep": {
          "0%": { backgroundSize: "0% 40%" },
          "100%": { backgroundSize: "100% 40%" },
        },
        "overlay-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "panel-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheet-in": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "sheet-side-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "highlight-sweep": "highlight-sweep 0.6s ease-out 0.2s both",
        "overlay-in": "overlay-in var(--motion-fast) ease-out both",
        "panel-in": "panel-in var(--motion-base) cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-in": "sheet-in var(--motion-base) cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-side-in": "sheet-side-in var(--motion-base) cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
