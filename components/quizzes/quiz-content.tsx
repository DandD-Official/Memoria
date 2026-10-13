"use client";
import { createContext, useContext } from "react";
import { MmdRenderer } from "@/components/mmd/renderer";

export const QuizAssets = createContext<Record<string, string | null> | undefined>(undefined);

/** Keep rich quiz fields intact, including nested MMD blocks. */
export function QuizContent({ content }: { content: string }) {
  const resolvedAssets = useContext(QuizAssets);
  return <div className="min-w-0 break-words [&_.memora-markdown>p:first-child]:mt-0 [&_.memora-markdown>p:last-child]:mb-0"><MmdRenderer content={content} resolvedAssets={resolvedAssets} /></div>;
}
