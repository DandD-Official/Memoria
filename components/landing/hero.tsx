import Link from "next/link";
import { ArrowDown, ArrowRight, Check, FileText, Layers3, ListChecks, Sparkles, TrendingUp } from "lucide-react";

const workflow = [
  { label: "Notes", detail: "Capture", icon: FileText, tone: "bg-memory-soft text-memory" },
  { label: "Reviewer", detail: "Shape", icon: Layers3, tone: "bg-accent-soft text-accent-dark" },
  { label: "Quiz", detail: "Practice", icon: ListChecks, tone: "bg-study-soft text-study" },
  { label: "Progress", detail: "Remember", icon: TrendingUp, tone: "bg-surface text-ink" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-14 sm:pb-28 sm:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_72%_16%,rgb(var(--color-accent-soft)/0.72),transparent_28rem)]" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <div className="animate-fade-up">
          <p className="section-kicker">A study space for your own material</p>
          <h1 className="mt-5 max-w-xl font-display text-[2.75rem] font-medium leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">
            Make your notes easier to <span className="italic text-accent-dark">remember.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
            Bring your class notes into one calm workspace. Shape them into reviewers, practice with quizzes and flashcards, and see what deserves your attention next.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-control border border-action bg-action px-5 text-sm font-semibold text-action-foreground shadow-sm motion-safe:transition-[background-color,scale] motion-safe:duration-150 hover:bg-action/90 active:scale-[0.96]">
              Build your study space <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/guest" className="inline-flex min-h-12 items-center rounded-control border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-surface-muted">
              Try it first
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-study" /> Import PDFs and text</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-study" /> Keep your material organized</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl animate-fade-up [animation-delay:150ms]">
          <div className="paper-grid relative overflow-hidden rounded-panel border border-line p-4 shadow-card-hover sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">The Memoria loop</p>
                <p className="mt-1 font-display text-xl text-ink">From scattered to study-ready</p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full border border-study/20 bg-study-soft px-2.5 py-1 text-xs font-medium text-study sm:inline-flex"><Sparkles className="h-3.5 w-3.5" /> In motion</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
              {workflow.map((item, index) => (
                <div key={item.label} className="contents">
                  <div className="relative flex items-center gap-3 rounded-card border border-line bg-surface/95 p-3 shadow-sm sm:block sm:min-h-32 sm:p-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${item.tone}`}><item.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" /></div>
                    <div className="sm:mt-7"><p className="text-xs text-ink-faint">{item.detail}</p><p className="font-display text-base text-ink">{item.label}</p></div>
                    {index === 2 && <span className="absolute end-3 top-3 h-2 w-2 rounded-full bg-study" aria-label="Current step" />}
                  </div>
                  {index < workflow.length - 1 && <ArrowRight className="mx-auto hidden h-4 w-4 text-ink-faint sm:block" aria-hidden="true" />}
                  {index < workflow.length - 1 && <ArrowDown className="mx-auto h-4 w-4 text-ink-faint sm:hidden" aria-hidden="true" />}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-center justify-between text-xs"><span className="font-medium text-ink">Cell biology · this week</span><span className="font-semibold text-study">68%</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full w-[68%] rounded-full bg-study" /></div>
                <p className="mt-2 text-xs text-ink-faint">Keep going — 2 weak topics are ready to revisit.</p>
              </div>
              <div className="ink-panel rounded-card p-4">
                <p className="text-xs text-white/60">Next best action</p>
                <p className="mt-1 font-display text-base text-white">Review mistakes</p>
                <p className="mt-2 text-xs text-white/65">12 cards waiting</p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -start-5 h-16 w-16 rounded-full border border-accent/30 bg-accent-soft/50" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
