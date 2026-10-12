import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("sends commands to the registered encrypted worker even while a legacy worker controls the tab", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("window", { isSecureContext: true });
  const active = { scriptURL: "https://memoria.test/offline-worker.js", state: "activated" };
  vi.stubGlobal("navigator", { serviceWorker: {
    controller: { scriptURL: "https://memoria.test/sw.js" },
    register: vi.fn().mockResolvedValue({ active }),
  } });
  const { offlineWorker } = await import("@/lib/offline/client");
  expect(await offlineWorker()).toBe(active);
});

it("retries registration after a transient startup failure", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubGlobal("window", { isSecureContext: true });
  const active = { scriptURL: "https://memoria.test/offline-worker.js", state: "activated" };
  const register = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ active });
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  const { offlineWorker } = await import("@/lib/offline/client");
  await expect(offlineWorker()).rejects.toThrow("Offline");
  expect(await offlineWorker()).toBe(active);
  expect(register).toHaveBeenCalledTimes(2);
});
