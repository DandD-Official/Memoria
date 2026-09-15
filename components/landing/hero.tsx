import Link from "next/link";
import { ArrowRight, FileText, Layers, ListChecks, TrendingUp } from "lucide-react";

const stack = [
  { label: "Notes", icon: FileText, rotate: "-rotate-3", tint: "bg-surface" },
  { label: "Reviewer", icon: Layers, rotate: "rotate-2", tint: "bg-surface" },
  { label: "Quiz", icon: ListChecks, rotate: "-rotate-1", tint: "bg-surface" },
  { label: "Results", icon: TrendingUp, rotate: "rotate-3", tint: "bg-accent-soft" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <p className="mb-5 inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Notes → Reviewers → Quizzes → Progress
          </p>
          <h1 className="font-display text-[2.75rem] leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Turn scattered notes into{" "}
            <span className="italic">structured knowledge</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            Import your notes, organize them into clean reviewers, and test yourself with quizzes and exams
            built from your own material — no AI bolted into the app, just a clean workflow that gets you
            studying faster.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-action px-6 text-sm font-medium text-action-foreground transition-transform hover:-translate-y-0.5 hover:bg-action/90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-lg border border-line bg-surface px-6 text-sm font-medium text-ink hover:bg-ink/5"
            >
              Sign in
            </Link>
            <Link href="/guest" className="text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink">
              Or try it without an account →
            </Link>
          </div>
        </div>

        <div className="relative mx-auto h-[380px] w-full max-w-sm animate-fade-up [animation-delay:150ms]">
          {stack.map((item, i) => (
            <div
              key={item.label}
              className={`card absolute left-1/2 flex w-64 -translate-x-1/2 items-center gap-3 px-5 py-4 ${item.rotate} ${item.tint}`}
              style={{ top: `${i * 78}px`, zIndex: i }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-faint">Step {i + 1}</p>
                <p className="font-display text-base text-ink">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
