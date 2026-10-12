import { afterEach, expect, it, vi } from "vitest";
import { canCheckOnlineSession, setLocalSession } from "@/lib/offline/local-session";

afterEach(() => vi.unstubAllGlobals());

it("skips session conflicts and revocation for offline unlock, including reconnection", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) }, dispatchEvent: vi.fn() });
  const navigator = { onLine: false };
  vi.stubGlobal("navigator", navigator);
  expect(canCheckOnlineSession()).toBe(false);
  setLocalSession(true);
  navigator.onLine = true;
  expect(canCheckOnlineSession()).toBe(false);
  setLocalSession(false);
  expect(canCheckOnlineSession()).toBe(true);
});
