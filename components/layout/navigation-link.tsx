"use client";

import NextLink from "next/link";
import { forwardRef, useContext } from "react";
import { NavigationContext } from "./navigation-loading";

/** Next Link still owns prefetching, modified clicks, downloads and external URLs. */
const NavigationLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof NextLink>>(function NavigationLink({ onNavigate, href, replace, scroll, ...props }, ref) {
  const navigate = useContext(NavigationContext);
  return <NextLink {...props} href={href} replace={replace} scroll={scroll} ref={ref} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (cancelled || !navigate || typeof href !== "string") return;
    const target = new URL(href, window.location.href);
    // Keep anchors and same-page clicks native; do not flash a page skeleton.
    if (target.pathname === window.location.pathname && target.search === window.location.search) return;
    event.preventDefault();
    navigate(href, replace, { scroll });
  }} />;
});

export default NavigationLink;
