import { MemoryMark } from "@/components/layout/brand";

export function BrandLoading({ intro = false }: { intro?: boolean }) {
  return <div className={intro ? "memoria-intro" : "memoria-loading"} aria-hidden={intro || undefined} role={intro ? undefined : "status"}>
    <div className="memoria-opening-mark"><MemoryMark className="h-20 w-20 text-action" /></div>
    <p className="memoria-opening-word font-display text-4xl tracking-tight">memoria<span className="text-accent-dark">.</span></p>
    <p className="memoria-opening-caption mt-3 text-sm text-ink-soft">{intro ? "Make room for what stays." : "Opening your learning space…"}</p>
    {!intro && <span className="memoria-loading-thread mt-8 h-px w-32 bg-accent-dark" aria-hidden="true" />}
  </div>;
}
