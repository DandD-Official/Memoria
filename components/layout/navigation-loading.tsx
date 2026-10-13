"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";

type Router = ReturnType<typeof useNextRouter>;
type Navigate = (href: string, replace?: boolean, options?: Parameters<Router["push"]>[1]) => void;
export const NavigationContext = createContext<Navigate | null>(null);

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const router = useNextRouter();
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState("");
  const navigate = useCallback<Navigate>((href, replace = false, options) => {
    setDestination(href);
    startTransition(() => { if (replace) router.replace(href, options); else router.push(href, options); });
  }, [router]);
  return <NavigationContext.Provider value={navigate}>
    <div aria-hidden={pending || undefined} ref={node => { if (node) node.inert = pending; }}>{children}</div>
    {pending && <div className="fixed inset-0 z-[250] overflow-y-auto bg-paper px-page" data-navigation-loading="true">
      <div className="mx-auto max-w-5xl py-8 sm:py-12"><p className="font-display text-2xl text-ink">memoria.</p><LoadingState variant="page" label={navigationLabel(destination)} /></div>
    </div>}
  </NavigationContext.Provider>;
}

function navigationLabel(href: string) {
  const section = href.split(/[?#]/)[0].split("/").filter(Boolean)[0];
  const names: Record<string, string> = { dashboard: "your desk", notes: "your notes", reviewers: "your reviewer", quizzes: "your quiz", books: "your book", notebooks: "your notebook", study: "your study session", workspaces: "your workspace", search: "search results", settings: "settings", notifications: "notifications", library: "your library" };
  return `Opening ${names[section] ?? "your page"}…`;
}

/** Programmatic navigation participates in the same immediate loading transition as links. */
export function useRouter(): Router {
  const router = useNextRouter();
  const navigate = useContext(NavigationContext);
  return useMemo(() => navigate ? { ...router, push: (href: string, options?: Parameters<Router["push"]>[1]) => navigate(href, false, options), replace: (href: string, options?: Parameters<Router["replace"]>[1]) => navigate(href, true, options) } : router, [router, navigate]);
}
