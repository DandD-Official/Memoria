import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/layout/theme-provider";
import { CodeThemeProvider } from "@/components/mmd/code-theme-context";
import { StartupScreen } from "@/components/layout/startup-screen";
import { ToastViewport } from "@/components/ui/toast";
import { PwaRegistration } from "@/components/layout/pwa-registration";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://memoria-studynotes.vercel.app"),
  applicationName: "Memoria",
  openGraph: {
    type: "website", siteName: "Memoria", title: "Memoria — A home for what you learn",
    description: "Turn your notes into study guides, clear diagrams, and practice. Create a shared workspace and learn together.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Memoria — Capture. Connect. Remember." }],
  },
  twitter: {
    card: "summary_large_image", title: "Memoria — A home for what you learn",
    description: "Notes, diagrams, study guides, and shared workspaces. Keep the thread of your learning.",
    images: ["/opengraph-image"],
  },
  title: "Memoria — Turn your notes into knowledge",
  description:
    "Import your notes, organize them into reviewers, and test yourself with customizable quizzes and exams.",
  icons: {
    icon: "/icon.svg?v=memoria-mark-2",
    apple: "/apple-icon-v2.png",
  },
  appleWebApp: { capable: true, title: "Memoria", statusBarStyle: "default" },
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
          <CodeThemeProvider><StartupScreen /><PwaRegistration />{children}<ToastViewport /></CodeThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
