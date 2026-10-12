import vm from "node:vm";
import { expect, it, vi } from "vitest";
import { DEV_OFFLINE_RECOVERY_SCRIPT } from "../lib/offline/dev-recovery";

it("removes only Memoria workers and asset caches, reloads once, and never opens private storage", async () => {
  const unregister = vi.fn(async () => true);
  const unrelated = vi.fn();
  const reload = vi.fn();
  const remove = vi.fn();
  const controller = { scriptURL: "http://localhost:3000/offline-worker.js" };
  const serviceWorker = { controller: controller as typeof controller | null, getRegistrations: async () => [
    { active: controller, unregister },
    { active: { scriptURL: "http://localhost:3000/other-worker.js" }, unregister: unrelated },
  ] };
  const context = vm.createContext({ URL, console, navigator: { serviceWorker }, window: { caches: {} },
    location: { origin: "http://localhost:3000", reload },
    caches: { keys: async () => ["memoria-offline-assets-v1", "memoria-shell-v2", "unrelated"], delete: remove },
  });
  Object.defineProperty(context, "indexedDB", { get: () => { throw new Error("Must preserve saved drafts"); } });
  await vm.runInContext(DEV_OFFLINE_RECOVERY_SCRIPT, context);
  expect(unregister).toHaveBeenCalledOnce();
  expect(unrelated).not.toHaveBeenCalled();
  expect(remove.mock.calls).toEqual([["memoria-offline-assets-v1"], ["memoria-shell-v2"]]);
  expect(reload).toHaveBeenCalledOnce();
  serviceWorker.controller = null;
  await vm.runInContext(DEV_OFFLINE_RECOVERY_SCRIPT, context);
  expect(reload).toHaveBeenCalledOnce();
});
