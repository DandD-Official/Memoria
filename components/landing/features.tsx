import { FileInput, Layers, ListChecks, Timer, GraduationCap, Share2 } from "lucide-react";

const features = [
  {
    icon: FileInput,
    title: "Import notes",
    text: "Bring in PDFs, text files, pasted content, or connected documents without losing the original context.",
  },
  {
    icon: Layers,
    title: "Build reviewers",
    text: "Shape raw material into readable study guides with headings, definitions, examples, tables, and callouts.",
  },
  {
    icon: ListChecks,
    title: "Practice recall",
    text: "Practice with questions grounded in the material you actually need to know.",
  },
  {
    icon: Timer,
    title: "Switch into exam mode",
    text: "Move from low-pressure practice to a focused exam session when you are ready.",
  },
  {
    icon: GraduationCap,
    title: "Study your weak spots",
    text: "Use flashcards, mistake review, and spaced repetition to strengthen what is not sticking yet.",
  },
  {
    icon: Share2,
    title: "Share with a partner",
    text: "Share a reviewer or quiz with clear view or edit permissions when studying together helps.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-line bg-surface/40 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <p className="section-kicker">One connected workspace</p>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl">Everything you need to study with intention</h2>
          <p className="mt-3 text-ink-soft">The tools stay connected, so each step gives the next one more context.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card interactive-card p-5 sm:p-6">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-control border border-accent/20 bg-accent-soft">
                <feature.icon className="h-5 w-5 text-accent-dark" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-medium text-ink">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
