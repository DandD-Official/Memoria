"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
export function WalkthroughProgress({ slug }: { slug: string }) {
  const [complete, setComplete] = useState(false);
  useEffect(() => { try { setComplete(localStorage.getItem(`memoria-guide:${slug}`) === "done"); } catch { /* Optional browser preference. */ } }, [slug]);
  return <Button variant={complete ? "outline" : "primary"} aria-pressed={complete} onClick={() => { const next = !complete; setComplete(next); try { localStorage.setItem(`memoria-guide:${slug}`, next ? "done" : ""); } catch { /* The guide remains usable without storage. */ } toast(next ? "Walkthrough marked complete on this device." : "Walkthrough progress reset."); }}>{complete && <Check className="h-4 w-4" />}{complete ? "Completed · reset" : "Mark walkthrough complete"}</Button>;
}
