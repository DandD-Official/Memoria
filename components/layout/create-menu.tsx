"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileInput, Layers3, Link2, ListChecks, Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

const createOptions = [
  { href: "/notes/import", label: "Create Memory", description: "Write, paste, or import source material", icon: FileInput },
  { href: "/books?create=1", label: "Create Book", description: "Arrange Memories into a reading sequence", icon: BookOpen },
  { href: "/reviewers?create=1", label: "Create Reviewer", description: "Build a structured study guide", icon: Layers3 },
  { href: "/quizzes?create=1", label: "Create Quiz", description: "Generate or import practice questions", icon: ListChecks },
  { href: "/diagrams", label: "Create Diagram", description: "Open the visual diagram workspace", icon: Workflow },
  { href: "/settings#connections", label: "Connected Apps", description: "Import from connected services", icon: Link2 },
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
      <Sheet open={open} onOpenChange={setOpen} title="Create something" description="Choose what you want to add to your workspace.">
        <nav aria-label="Create options" className="space-y-2">
          {createOptions.map((option) => (
            <Link key={option.href} href={option.href} onClick={() => setOpen(false)} className="group flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface p-3 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-muted">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-accent/20 bg-accent-soft text-accent-dark"><option.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{option.label}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{option.description}</span></span>
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
