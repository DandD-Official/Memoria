import Link from "next/link";
import { MemoryMark } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-medium text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-control border border-accent/25 bg-accent-soft text-accent-dark shadow-sm"><MemoryMark className="h-5 w-5" /></span>
          <span>Memoria</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="#workflow" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
            How it works
          </Link>
          <Link href="#features" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
            Features
          </Link>
          <ThemeToggle />
          <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link href="/guest" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
            Try it first
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-lg bg-action px-4 text-sm font-medium text-action-foreground hover:bg-action/90"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
