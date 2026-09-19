const steps = [
  { label: "Capture", text: "Import a file, paste a lesson, or connect an existing source." },
  { label: "Shape", text: "Keep the raw note, then turn it into a structured reviewer." },
  { label: "Practice", text: "Create quizzes and flashcards from the material you own." },
  { label: "Remember", text: "Use results, mistakes, and progress to choose what comes next." },
];

export function Workflow() {
  return (
    <section id="workflow" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div className="max-w-xl">
            <p className="section-kicker">A simple loop you can trust</p>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl">Your material stays at the center</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-ink-soft">Memoria gives you the structure to study well without taking control away. If you use an AI assistant to shape material, you review the result before it becomes part of your workspace.</p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.label} className="card relative p-5 sm:p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-xs font-semibold text-accent-dark">{index + 1}</span>
              <h3 className="mt-5 font-display text-lg font-medium text-ink">{step.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
