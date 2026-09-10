import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/layout/theme-provider";
import { CodeThemeProvider } from "@/components/mmd/code-theme-context";

export const metadata: Metadata = {
  title: "Memoria — Turn your notes into knowledge",
  description:
    "Import your notes, organize them into reviewers, and test yourself with customizable quizzes and exams.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before hydration so appearance (including for signed-out
            visitors) applies with no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <CodeThemeProvider>{children}</CodeThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
