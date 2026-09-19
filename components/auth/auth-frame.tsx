import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand, MemoryMark } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AuthFrame({ children, title, description, chapter = "A space of your own" }: { children: React.ReactNode; title: string; description?: string; chapter?: string }) {
  return <div className="min-h-dvh bg-paper"><header className="mx-auto flex min-h-24 max-w-7xl items-center justify-between px-page"><Brand compact /><div className="flex items-center gap-3 sm:gap-5"><ThemeToggle /><Link href="/guest" className="inline-flex min-h-11 items-center gap-1 text-xs text-ink-soft">Try guest mode<ArrowUpRight className="h-3.5 w-3.5" /></Link></div></header><main className="mx-auto grid min-h-[calc(100dvh-6rem)] max-w-6xl items-center gap-12 px-page pb-16 pt-8 lg:grid-cols-2 lg:gap-24">
    <div className="hidden lg:block"><p className="eyebrow">{chapter}</p><h2 className="mt-6 max-w-md font-display text-5xl leading-[1.12] tracking-[-0.045em]">Make room for<br /><em>what stays.</em></h2><p className="mt-6 max-w-sm text-base leading-relaxed text-ink-soft">A note becomes an idea. An idea becomes understanding. A little practice makes it yours.</p><div className="mt-12 flex items-center gap-5 border-y border-line py-6"><MemoryMark className="h-16 w-16 text-action" /><p className="max-w-64 font-display text-lg italic text-ink-soft">One place to gather the threads of your learning.</p></div><p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-ink-faint">Capture / Connect / Remember</p></div>
    <div className="mx-auto w-full max-w-md border-t-2 border-action pt-8"><p className="eyebrow mb-3">Memoria / Your learning journal</p><h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{description}</p>}<div className="mt-8">{children}</div></div>
  </main></div>;
}
