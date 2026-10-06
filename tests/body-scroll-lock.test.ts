import { afterEach, describe, expect, it, vi } from "vitest";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

afterEach(() => vi.unstubAllGlobals());

describe("nested reader and dialog scrolling", () => {
  it.each(["reader first", "dialog first"])("keeps scrolling locked when the %s closes", order => {
    const body = { style: { overflow: "auto" } };
    vi.stubGlobal("document", { body });
    const closeReader = lockBodyScroll(), closeDialog = lockBodyScroll();
    const [first, last] = order === "reader first" ? [closeReader, closeDialog] : [closeDialog, closeReader];
    first(); expect(body.style.overflow).toBe("hidden");
    last(); expect(body.style.overflow).toBe("auto");
  });
  it("releases each lock once and preserves an existing page lock", () => {
    const body = { style: { overflow: "hidden" } };
    vi.stubGlobal("document", { body });
    const closeFirst = lockBodyScroll(), closeSecond = lockBodyScroll();
    closeFirst(); closeFirst(); expect(body.style.overflow).toBe("hidden");
    closeSecond(); expect(body.style.overflow).toBe("hidden");
  });
});
