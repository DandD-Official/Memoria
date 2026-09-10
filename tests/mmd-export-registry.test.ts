import { describe, expect, it } from "vitest";
import { createMmdAssetRegistry } from "@/lib/export/asset-registry";

describe("MMD export asset registry", () => {
  it("waits until every asynchronous asset reaches a terminal state", async () => {
    const registry = createMmdAssetRegistry();
    const finishDiagram = registry.begin("diagram:test");
    const finishImage = registry.begin("image:test");
    let settled = false;
    const waiting = registry.waitUntilSettled().then(() => { settled = true; });

    await Promise.resolve();
    expect(settled).toBe(false);
    finishDiagram();
    await Promise.resolve();
    expect(settled).toBe(false);
    finishImage();
    await waiting;
    expect(settled).toBe(true);
    expect(registry.pendingKeys()).toEqual([]);
  });
});
