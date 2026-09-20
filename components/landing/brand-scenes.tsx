import Image from "next/image";

export function BrandHero() {
  return <figure className="relative isolate overflow-hidden rounded-card bg-[#203a2b]">
    <Image src="/brand/memoria/hero.png" alt="An open learning journal surrounded by flashcards and connected ideas" width={1672} height={941} priority className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#142a1e]/95 via-[#142a1e]/55 to-transparent" />
    <figcaption className="absolute inset-y-0 start-0 flex w-3/5 flex-col justify-center gap-4 p-5 text-[#fffff5] sm:p-8">
      <Image src="/brand/memoria/logo.svg" alt="Memoria" width={156} height={50} className="w-28 rounded-control sm:w-36" />
      <p className="font-display text-[clamp(1.4rem,3vw,2.5rem)] leading-tight">Make room<br />for what stays.</p>
      <p className="text-xs leading-relaxed sm:text-sm">Capture an idea.<br />Connect the dots.<br />Remember more.</p>
    </figcaption>
  </figure>;
}

const scenes = [
  { image: "01-capture", step: "01 / Capture", title: "Every idea starts somewhere.", copy: "Bring your notes, slides, and sparks of curiosity." },
  { image: "02-connect", step: "02 / Connect", title: "Turn notes into understanding.", copy: "Find the thread with guides, diagrams, and examples." },
  { image: "03-remember", step: "03 / Remember", title: "Make it yours, for longer.", copy: "Practice recall. Revisit what matters. Keep growing." },
];

export function BrandScenes() {
  return <section aria-label="From first notes to lasting knowledge" className="mx-auto grid max-w-7xl gap-6 px-page py-14 md:grid-cols-3">
    {scenes.map(scene => <figure key={scene.image} className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative"><Image src={`/brand/memoria/${scene.image}.png`} alt="" width={1024} height={1024} className="aspect-square w-full object-cover" /><span className="absolute start-4 top-4 rounded-control bg-[#f7f7ef] px-3 py-2 font-mono text-xs text-[#22312b]">{scene.step}</span></div>
      <figcaption className="border-t border-line p-6"><h2 className="font-display text-2xl leading-tight">{scene.title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">{scene.copy}</p></figcaption>
    </figure>)}
  </section>;
}
