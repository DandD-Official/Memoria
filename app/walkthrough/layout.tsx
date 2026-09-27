import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
export default function WalkthroughLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper"><a href="#main-content" className="skip-link">Skip to content</a><header className="mx-auto flex min-h-24 max-w-6xl items-center justify-between gap-4 px-page"><Brand /><div className="flex items-center gap-4"><ThemeToggle /><Link href="/dashboard" className="journal-link">Open your desk</Link></div></header><main id="main-content" className="mx-auto max-w-6xl px-page py-10 sm:py-16">{children}</main><footer className="mx-auto flex max-w-6xl flex-wrap gap-6 border-t border-line px-page py-6 text-xs"><Link href="/walkthrough" className="py-3 hover:underline">All walkthroughs</Link><Link href="/privacy-policy" className="py-3 hover:underline">Privacy policy</Link><Link href="/terms-of-service" className="py-3 hover:underline">Terms of service</Link></footer></div>;
}
