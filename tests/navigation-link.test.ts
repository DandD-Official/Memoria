import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));
vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => { state.props = props; return null; } }));
import NavigationLink from "@/components/layout/navigation-link";
import { NavigationContext } from "@/components/layout/navigation-loading";

describe("navigation loading links", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { href: "https://memoria.test/notes?q=one", pathname: "/notes", search: "?q=one" } });
  });
  function render(props: React.ComponentProps<typeof NavigationLink>) {
    const navigate = vi.fn();
    renderToStaticMarkup(createElement(NavigationContext.Provider, { value: navigate }, createElement(NavigationLink, props)));
    const preventDefault = vi.fn();
    (state.props.onNavigate as (event: { preventDefault: () => void }) => void)({ preventDefault });
    return { navigate, preventDefault };
  }
  it("starts the loading transition and preserves replace and scroll options", () => {
    const { navigate, preventDefault } = render({ href: "/quizzes/one", replace: true, scroll: false, prefetch: true });
    expect(navigate).toHaveBeenCalledWith("/quizzes/one", true, { scroll: false });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(state.props.prefetch).toBe(true);
  });
  it("does not replace native same-page and anchor navigation", () => {
    for (const href of ["#section", "/notes?q=one"]) {
      const result = render({ href });
      expect(result.navigate).not.toHaveBeenCalled();
      expect(result.preventDefault).not.toHaveBeenCalled();
    }
  });
  it("handles search parameter changes as navigation", () => {
    expect(render({ href: "/notes?q=two" }).navigate).toHaveBeenCalledOnce();
  });
  it("honors a caller cancelling navigation", () => {
    const result = render({ href: "/books", onNavigate: event => event.preventDefault() });
    expect(result.navigate).not.toHaveBeenCalled();
    expect(result.preventDefault).toHaveBeenCalledOnce();
  });
});
