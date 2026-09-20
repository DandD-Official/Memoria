import Link from "next/link";
import { BookMarked } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-line px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-ink-soft sm:flex-row">
        <div className="flex items-center gap-2 font-display text-ink">
          <BookMarked className="h-4 w-4 text-accent-dark" />
          Memoria
        </div>
        <p>Turn your notes into knowledge.</p>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-ink">Sign in</Link>
          <Link href="/register" className="hover:text-ink">Get started</Link>
        </div>
      </div>
    </footer>
  );
}
