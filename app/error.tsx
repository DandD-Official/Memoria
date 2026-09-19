"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryMark } from "@/components/layout/brand";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl px-5 py-20"><MemoryMark className="mb-8 h-14 w-14 text-action" /><p className="eyebrow">A pause in the connection</p><h1 className="mt-4 font-display text-3xl tracking-tight">This page couldn’t open.</h1><p className="mt-4 text-sm leading-relaxed text-ink-soft">The connection may have been interrupted, or the service is temporarily unavailable. Try opening it again.</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={reset}><RefreshCw className="h-4 w-4" />Try again</Button><Link href="/dashboard" className="journal-link">Return to your desk</Link></div></div>;
}
