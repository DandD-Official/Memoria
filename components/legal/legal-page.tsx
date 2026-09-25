import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function LegalPage({ title, description, sections }: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="mx-auto flex min-h-24 max-w-6xl items-center justify-between gap-4 px-page">
        <Brand />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/" className="inline-flex min-h-11 items-center text-sm hover:underline">Home</Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-page pb-16 pt-8 sm:pt-14">
        <div className="max-w-3xl border-t-2 border-action pt-6">
          <p className="eyebrow">Memoria / Your information and choices</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">{description}</p>
          <p className="mt-5 text-xs text-ink-soft">Last updated <time dateTime="2026-09-25">September 25, 2026</time></p>
        </div>
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="border-y border-line py-5 lg:sticky lg:top-8">
            <p className="eyebrow mb-3">On this page</p>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="flex min-h-11 items-center gap-3 py-2 text-sm text-ink-soft hover:text-ink hover:underline">
                    <span className="font-mono text-xs text-ink-faint" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="min-w-0 max-w-3xl space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-8 border-b border-line pb-10 last:border-0 last:pb-0">
                <h2 id={`${section.id}-heading`} className="font-display text-2xl tracking-tight">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-ink-soft [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-action [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-page py-6">
        <Brand compact />
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 text-xs">
          <Link href="/privacy-policy" className="inline-flex min-h-11 items-center hover:underline">Privacy policy</Link>
          <Link href="/terms-of-service" className="inline-flex min-h-11 items-center hover:underline">Terms of service</Link>
        </nav>
      </footer>
    </div>
  );
}
