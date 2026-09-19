import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return <main className="mx-auto max-w-2xl px-page py-14"><Brand /><p className="eyebrow mt-20">A missing thread / 404</p><h1 className="mt-4 font-display text-4xl tracking-tight">This page isn’t here.</h1><p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">The link may have changed, the material may have been removed, or it may not be shared with you. Check the link or ask its owner for access.</p><div className="mt-8 flex flex-wrap gap-4"><ButtonLink href="/dashboard">Return to your desk</ButtonLink><Link href="/" className="journal-link">Visit Memoria</Link></div></main>;
}
