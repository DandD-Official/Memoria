import { afterEach, describe, expect, it, vi } from "vitest";
import { readDefaultTableView, saveDefaultTableView, TABLE_VIEW_STORAGE_KEY } from "@/lib/table-view";

afterEach(() => vi.unstubAllGlobals());

describe("default table view storage", () => {
  it("restores a saved preference and can switch back to scroll", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
    expect(readDefaultTableView()).toBe("scroll");
    expect(saveDefaultTableView("fit")).toBe(true);
    expect(storage.get(TABLE_VIEW_STORAGE_KEY)).toBe("fit");
    expect(readDefaultTableView()).toBe("fit");
    expect(saveDefaultTableView("scroll")).toBe(true);
    expect(readDefaultTableView()).toBe("scroll");
  });

  it("ignores unrecognized preferences", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => "invalid" } });
    expect(readDefaultTableView()).toBe("scroll");
  });

  it("falls back safely when browser storage is unavailable", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("Storage blocked"); } });
    expect(readDefaultTableView()).toBe("scroll");
    expect(saveDefaultTableView("fit")).toBe(false);
  });

  it("uses a stable default during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(readDefaultTableView()).toBe("scroll");
  });
});
