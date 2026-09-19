import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="border-b border-line">
        <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-2 px-page">
          <Brand compact />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <ButtonLink href="/register" size="sm" className="px-3">Create an account</ButtonLink>
          </div>
        </div>
      </header>
      <div className="border-b border-line bg-accent-soft/50 px-page py-3 text-center text-sm text-accent-dark">
        Guest workspace. Export your work before leaving or refreshing this page.{" "}
        <Link href="/register" className="font-medium underline underline-offset-2">
          Create an account
        </Link>{" "}
        to keep your library.
      </div>
      <main id="main-content" tabIndex={-1} className="px-page py-8 sm:py-12">{children}</main>
    </div>
  );
}
