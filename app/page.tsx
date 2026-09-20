import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, FileText, Workflow, Share2, Download, Sparkles, Layers3 } from "lucide-react";
import { Brand, MemoryMark } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { BrandHero, BrandScenes } from "@/components/landing/brand-scenes";
import { LearningExample } from "@/components/landing/learning-example";

export default function LandingPage() {
  return <div className="landing-journal">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="mx-auto flex min-h-24 max-w-7xl items-center justify-between gap-4 px-page">
      <Brand /><nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-6"><a href="#possibilities" className="hidden text-sm text-ink-soft hover:text-ink md:block">The possibilities</a><ThemeToggle /><Link href="/login" className="inline-flex min-h-11 items-center text-sm font-medium">Log in</Link><ButtonLink href="/guest" variant="outline" className="hidden sm:inline-flex">Try it out <ArrowUpRight className="h-4 w-4" /></ButtonLink></nav>
    </header>
    <main id="main-content">
      <section className="mx-auto grid max-w-7xl gap-12 px-page pb-16 pt-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-accent-dark" />A home for what you learn</p>
          <h1 className="mt-7 font-display text-[clamp(2.7rem,5.2vw,4.8rem)] leading-[1.05] tracking-[-0.055em]">Less collecting.<br />More <span className="relative inline-block italic">connecting.<svg viewBox="0 0 360 14" preserveAspectRatio="none" className="absolute -bottom-3 left-0 h-3 w-full text-accent" aria-hidden="true"><path d="M2 9Q160 -2 358 5" fill="none" stroke="currentColor" strokeWidth="7" /></svg></span></h1>
          <p className="mt-9 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">Turn the things you need to study into the things you actually remember.</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">Bring your notes. Find the connections. Make a study guide, test an idea, and return to it when it matters.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3"><ButtonLink href="/register" size="lg">Make room for learning <ArrowRight className="h-4 w-4" /></ButtonLink><ButtonLink href="/guest" variant="ghost">Try without an account <ArrowUpRight className="h-4 w-4" /></ButtonLink></div>
          <p className="mt-5 text-xs text-ink-faint">Your material. Your pace. One connected place.</p>
          <a href="#possibilities" className="mt-12 inline-flex min-h-11 items-center gap-3 text-xs text-ink-soft"><ArrowDown className="h-4 w-4" /> Follow the thread</a>
        </div>
        <div className="relative"><div className="absolute -inset-4 -z-10 hidden rotate-2 border border-line bg-surface-muted sm:block" /><BrandHero /><p className="mt-4 text-center font-display text-sm italic text-ink-soft">From “I read this” to “I know this.”</p></div>
      </section>
      <BrandScenes />
      <section className="mx-auto max-w-3xl px-page pb-16"><LearningExample /></section>
      <section id="possibilities" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-page py-14 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div><p className="eyebrow">A connected way to learn</p><h2 className="mt-5 max-w-sm font-display text-3xl leading-tight tracking-tight sm:text-4xl">Your library is<br />only the beginning.</h2><p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">Notes, diagrams, guides, and practice belong together. Memoria helps you move between them, without losing the source.</p><div className="mt-8 flex items-center gap-3"><MemoryMark className="h-12 w-12 text-action" /><span className="font-display text-base italic text-ink-soft">Keep the thread.</span></div></div>
          <div className="grid sm:grid-cols-2 sm:gap-x-8">{[
            { number: "01", title: "Bring the raw material", description: "PDFs, slides, documents, Markdown, or a thought you need to write down. Connect Google Drive and Notion, too.", icon: FileText },
            { number: "02", title: "Give ideas a shape", description: "Build a reviewer in your style. Map a process. Keep the source close while the connections become clear.", icon: Workflow },
            { number: "03", title: "Find out what sticks", description: "Seven question types, flashcards, and focused exams. Explanations turn a missed answer into a useful next step.", icon: Layers3 },
            { number: "04", title: "Come back at the right time", description: "A due-card queue and spaced repetition keep your next review grounded in what you have actually studied.", icon: Sparkles },
          ].map(item => <div key={item.number} className="learning-step"><span className="learning-step-number">{item.number}</span><div><item.icon className="mb-4 h-5 w-5 text-accent-dark" /><h3 className="font-display text-xl">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.description}</p></div></div>)}</div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-page py-14 sm:py-20 md:grid-cols-3">
        <div><Share2 className="mb-4 h-5 w-5 text-ink-soft" /><h2 className="font-display text-xl">Learning is better shared.</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">Curate study spaces, invite classmates, and publish a collection. Decide who can read, edit, and export.</p></div>
        <div><Sparkles className="mb-4 h-5 w-5 text-ink-soft" /><h2 className="font-display text-xl">A little help, in the right place.</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">Use AI to shape your material into guides and questions. Choose an available shared connection or bring your own provider.</p></div>
        <div><Download className="mb-4 h-5 w-5 text-ink-soft" /><h2 className="font-display text-xl">Your knowledge travels with you.</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">Export documents, printable exams, Markdown, JSON, and Anki-compatible flashcards. Keep what you make.</p></div>
      </section>
      <section className="mx-auto max-w-7xl px-page pb-16"><div className="flex flex-col justify-between gap-8 border-y border-line bg-accent-soft px-6 py-10 sm:px-10 md:flex-row md:items-center"><div><p className="eyebrow">Start with one thing</p><h2 className="mt-3 font-display text-3xl tracking-tight">What would you like to remember?</h2><p className="mt-3 text-sm text-ink-soft">A lecture. A chapter. An idea that deserves to stay.</p></div><ButtonLink href="/guest" size="lg">Open a fresh page <ArrowRight className="h-4 w-4" /></ButtonLink></div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-line px-page py-7"><Brand /><p className="text-xs text-ink-faint">A place for knowledge to become yours.</p><div className="flex gap-5 text-xs"><Link href="/login" className="min-h-10 py-3 hover:underline">Log in</Link><Link href="/register" className="min-h-10 py-3 hover:underline">Create an account</Link></div></footer>
  </div>;
}
