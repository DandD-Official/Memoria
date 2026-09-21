"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileInput, Layers3, Link2, ListChecks, Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

const createOptions = [
  { href: "/notes/import", label: "Bring your material", description: "Import a file, paste text, or write a note", icon: FileInput },
  { href: "/reviewers?create=1", label: "Build a study guide", description: "Turn source notes into a reviewer", icon: Layers3 },
  { href: "/diagrams", label: "Map an idea", description: "Connect concepts on a diagram canvas", icon: Workflow },
  { href: "/quizzes?create=1", label: "Make a practice set", description: "Create a quiz or configure an exam", icon: ListChecks },
  { href: "/books?create=1", label: "Curate a study space", description: "Collect material to read and share together", icon: BookOpen },
  { href: "/notebooks?create=1", label: "Start a notebook", description: "Organize memories into subjects", icon: Layers3 },
  { href: "/settings#connections", label: "Connect your sources", description: "Bring in Google Drive or Notion", icon: Link2 },
];

export function CreateMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="px-2.5 sm:px-3.5">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Create</span>
        <span className="sr-only sm:hidden">Create</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="What are you working on?" description="Start with material. Make it your own.">
        <nav aria-label="Create options" className="divide-y divide-line">
          {createOptions.map((option) => (
            <Link key={option.href} href={option.href} onClick={() => setOpen(false)} className="group flex min-h-20 items-center gap-4 px-2 py-4 transition-colors hover:bg-surface-muted">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-accent/20 bg-accent-soft text-accent-dark"><option.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{option.label}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{option.description}</span></span>
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
