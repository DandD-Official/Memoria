import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { walkthroughs } from "@/lib/walkthrough";
import { ButtonLink } from "@/components/ui/button";
import { WalkthroughProgress } from "@/components/onboarding/walkthrough-progress";
export function generateStaticParams() { return walkthroughs.map(guide => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = walkthroughs.find(item => item.slug === slug);
  return { title: `${guide?.title ?? "Walkthrough"} | Memoria`, description: guide?.description };
}
export default async function WalkthroughDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const index = walkthroughs.findIndex(guide => guide.slug === slug); const guide = walkthroughs[index]; if (!guide) notFound(); const next = walkthroughs[index + 1];
  return <article className="mx-auto max-w-3xl"><Link href="/walkthrough" className="journal-link">← All walkthroughs</Link><p className="eyebrow mt-8">Walkthrough {index + 1} / {walkthroughs.length}</p><h1 className="mt-4 font-display text-4xl tracking-tight">{guide.title}</h1><p className="mt-4 text-base text-ink-soft">{guide.description}</p><ol className="mt-10 space-y-8">{guide.steps.map((step, number) => <li key={step.title} className="flex gap-5 border-t border-line pt-6"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-sm">{number + 1}</span><div><h2 className="font-display text-xl">{step.title}</h2><p className="mt-3 text-sm leading-7 text-ink-soft">{step.text}</p></div></li>)}</ol><div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-7"><ButtonLink href={guide.href}>{guide.action}</ButtonLink><WalkthroughProgress slug={slug} /></div>{next && <Link href={`/walkthrough/${next.slug}`} className="journal-link mt-6">Next: {next.title} →</Link>}</article>;
}
