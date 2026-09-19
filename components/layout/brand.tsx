import Link from "next/link";
import { cn } from "@/lib/utils";

export function MemoryMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className={cn("h-9 w-9 shrink-0", className)}><path d="M6 26V13a6 6 0 0 1 12 0v10a4 4 0 0 1-8 0v-6a4 4 0 0 1 8 0v6a4 4 0 0 0 8 0V13a6 6 0 0 0-12 0v13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="30" cy="27" r="2.5" fill="currentColor" /></svg>;
}
export function Brand({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)} aria-label="Memoria home"><MemoryMark /><span className={cn("font-display text-[1.65rem] tracking-[-0.055em]", compact && "hidden sm:inline")}>memoria<span className="text-accent-dark">.</span></span></Link>;
}
