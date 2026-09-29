"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLoading } from "@/components/ui/brand-loading";
/** Covers hydration only; no artificial delay or dependency on external assets. */
export function StartupScreen() {
  const pathname = usePathname();
  const [pending, setPending] = useState(true);
  useEffect(() => { setPending(false); }, []);
  if (!pending || pathname === "/") return null;
  return <><div id="memoria-startup" className="pointer-events-none fixed inset-0 z-[300]"><BrandLoading /></div><noscript><style>{"#memoria-startup { display: none !important; }"}</style></noscript></>;
}
