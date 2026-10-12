import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../public/offline-worker.js", import.meta.url), "utf8");
const base = { path: "/api/notes/n1", title: "Original", content: "Private learning material", updatedAt: "2026-10-01T00:00:00.000Z" };
const phrase = "correct horse device phrase";

function worker(records = new Map<string, unknown>()) {
  const assets = new Map<string, Response>();
  const listeners: Record<string, (event: unknown) => void> = {};
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({ user: { id: "alice", email: "alice@example.com" } }));
  const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, URL, Request, Response, fetch: fetcher,
    caches: { open: async () => ({ match: async (request: Request | string) => assets.get(typeof request === "string" ? request : request.url)?.clone(), put: async (request: Request | string, response: Response) => { assets.set(typeof request === "string" ? request : request.url, response); } }) },
    self: { location: { origin: "https://memoria.test" }, clients: { matchAll: async () => [] }, addEventListener: (type: string, listener: (event: unknown) => void) => { listeners[type] = listener; } },
    recordAdapter: async (mode: string, key: string, value: unknown) => {
      if (mode === "get") return records.get(key);
      if (mode === "keys") return [...records.keys()];
      if (mode === "clear") return records.clear();
      if (mode === "delete") return records.delete(key);
      records.set(key, value);
    },
  });
  vm.runInContext(source + "\nrecord = recordAdapter; globalThis.api = { command, read, sync, prepare, responseKey, cacheResponse };", context);
  const api = context.api as {
    command(data: Record<string, unknown>): Promise<any>;
    read(key: string): Promise<any>;
    sync(): Promise<void>;
    prepare(): Promise<void>;
    responseKey(request: Request): Promise<string>;
    cacheResponse(request: Request, response: Response, current?: unknown): Promise<void>;
  };
  async function enroll() { await api.command({ type: "ENROLL", passphrase: phrase }); }
  async function seed() { await api.command({ type: "DOCUMENT", document: base }); }
  async function save(content = "Edited offline") { await api.command({ type: "SAVE_DOCUMENT", path: base.path, title: "Draft", content }); }
  async function fetchRequest(request: Request) {
    let result: Promise<Response> | undefined;
    listeners.fetch({ request, respondWith: (value: Promise<Response>) => { result = value; }, waitUntil: () => undefined });
    return result ? await result : null;
  }
  async function message(data: Record<string, unknown>) {
    let pending: Promise<void> | undefined;
    let reply: { result?: { unlocked: boolean }; resume?: unknown } = {};
    listeners.message({ data, source: { id: "tab-1", url: "https://memoria.test/notes" }, ports: [{ postMessage: (value: typeof reply) => { reply = value; } }], waitUntil: (value: Promise<void>) => { pending = value; } });
    await pending;
    return reply;
  }
  return { api, records, assets, fetcher, enroll, seed, save, fetchRequest, message };
}

describe("encrypted offline worker", () => {
  it("keeps incomplete edits encrypted locally until they are ready to upload", async () => {
    const w = worker(); await w.enroll(); await w.seed();
    await w.api.command({ type: "SAVE_DOCUMENT", path: base.path, title: "", content: "" });
    expect(await w.api.read(`document:${base.path}`)).toMatchObject({ title: "", content: "", pending: true });
  });
  it("prepares Practice and Together navigation and editable records without opening their editors", async () => {
    const w = worker(); await w.enroll();
    w.fetcher.mockImplementation(async input => {
      const path = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "https://memoria.test").pathname;
      if (path === "/api/auth/session") return Response.json({ user: { id: "alice" } });
      if (path === "/api/offline/manifest") return Response.json({ userId: "alice", paths: ["/study", "/books", "/notebooks"], documents: [base.path] });
      if (path === base.path) return Response.json({ note: base });
      const flight = input instanceof Request && input.headers.get("rsc");
      return new Response(flight ? `flight:${path}` : `<html>${path}</html>`, { headers: { "Content-Type": flight ? "text/x-component" : "text/html" } });
    });
    await w.api.prepare();
    const ready = await w.api.command({ type: "STATUS" });
    expect(ready.preparation).toMatchObject({ state: "complete", completed: 4, total: 4, failed: [] });
    expect(ready.lastPreparedAt).toBeTruthy();
    w.fetcher.mockRejectedValue(new TypeError("offline"));
    for (const path of ["/study", "/books", "/notebooks"]) {
      expect(await (await w.fetchRequest(new Request(`https://memoria.test${path}`, { headers: { rsc: "1", "next-router-state-tree": "another-route" } })))?.text()).toBe(`flight:${path}`);
    }
    await w.save("First edit made offline");
    expect((await w.api.read(`document:${base.path}`)).content).toBe("First edit made offline");
    expect((await w.api.command({ type: "STATUS" })).pending).toBe(1);
  });

  it("reports partial preparation and continues saving remaining pages", async () => {
    const w = worker(); await w.enroll();
    w.fetcher.mockImplementation(async input => {
      const path = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "https://memoria.test").pathname;
      if (path === "/api/auth/session") return Response.json({ user: { id: "alice" } });
      if (path === "/api/offline/manifest") return Response.json({ userId: "alice", paths: ["/study", "/books"] });
      if (path === "/study") return new Response("Failed", { status: 500 });
      return new Response("saved", { headers: { "Content-Type": "text/html" } });
    });
    await w.api.prepare();
    const status = await w.api.command({ type: "STATUS" });
    expect(status.preparation).toMatchObject({ state: "partial", completed: 1, total: 2, failed: [{ path: "/study" }] });
    expect(status.lastPreparedAt).toBeNull();
  });

  it("reports a failed sync without discarding the pending edit or claiming success", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    w.fetcher.mockRejectedValue(new TypeError("offline"));
    await expect(w.api.sync()).rejects.toThrow();
    expect(await w.api.command({ type: "STATUS" })).toMatchObject({ pending: 1, lastSyncedAt: null, synchronization: { state: "error" } });
  });
  it("replaces stale JavaScript online and retains the updated copy offline", async () => {
    const w = worker();
    const request = new Request("https://memoria.test/_next/static/chunks/app/layout.js");
    w.assets.set(request.url, new Response("old module"));
    w.fetcher.mockResolvedValueOnce(new Response("current module"));
    expect(await (await w.fetchRequest(request))?.text()).toBe("current module");
    w.fetcher.mockRejectedValueOnce(new TypeError("Offline"));
    expect(await (await w.fetchRequest(request))?.text()).toBe("current module");
  });
  it("persists encrypted identity and drafts, rejects wrong unlock, and locks reads", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    const stored = JSON.stringify([...w.records], (_key, value) => value instanceof ArrayBuffer ? Array.from(new Uint8Array(value)) : value);
    expect(stored).not.toContain(phrase);
    expect(stored).not.toContain("alice@example.com");
    expect(stored).not.toContain("Edited offline");
    await w.api.command({ type: "LOCK" });
    expect(await w.api.read(`document:${base.path}`)).toBeNull();
    await expect(w.api.command({ type: "UNLOCK", passphrase: "wrong passphrase" })).rejects.toThrow("does not match");
    await expect(w.api.command({ type: "UNLOCK", passphrase: phrase, email: "bob@example.com" })).rejects.toThrow("does not match");
    await w.api.command({ type: "UNLOCK", passphrase: phrase, email: "alice@example.com" });
    expect((await w.api.read(`document:${base.path}`)).content).toBe("Edited offline");
  });

  it("coalesces edits and preserves a pending draft over stale page props", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save("First"); await w.save("Latest");
    const restored = await w.api.command({ type: "DOCUMENT", document: base });
    expect(restored.content).toBe("Latest");
    expect(restored.updatedAt).toBe(base.updatedAt);
    expect((await w.api.command({ type: "STATUS" })).pending).toBe(1);
  });

  it("does not overwrite a newer edit made during an in-flight sync", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save("First");
    let finish!: (value: Response) => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    w.fetcher.mockImplementation(async url => {
      if (String(url) === "/api/auth/session") return Response.json({ user: { id: "alice" } });
      started(); return new Promise<Response>(resolve => { finish = resolve; });
    });
    const sync = w.api.sync(); await entered; await w.save("Second");
    finish(Response.json({ updatedAt: "2026-10-02T00:00:00.000Z" })); await sync;
    const saved = await w.api.read(`document:${base.path}`);
    expect(saved.content).toBe("Second"); expect(saved.pending).toBe(true);
    expect(saved.updatedAt).toBe("2026-10-02T00:00:00.000Z");
  });

  it("preserves drafts on conflicts, stops retrying them, and keeps failures queued", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    w.fetcher.mockResolvedValueOnce(Response.json({ user: { id: "alice" } })).mockResolvedValueOnce(Response.json({ error: "Conflict" }, { status: 409 }));
    await w.api.sync();
    const saved = await w.api.read(`document:${base.path}`);
    expect(saved).toMatchObject({ conflict: true, pending: true, content: "Edited offline" });
    const calls = w.fetcher.mock.calls.length;
    await w.api.sync(); expect(w.fetcher.mock.calls.length).toBe(calls + 1);
  });

  it("never uploads another account's drafts", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    w.fetcher.mockResolvedValue(Response.json({ user: { id: "bob" } }));
    await expect(w.api.sync()).rejects.toThrow("same account");
    expect(w.fetcher.mock.calls.every(call => String(call[0]) === "/api/auth/session")).toBe(true);
    expect((await w.api.command({ type: "STATUS" })).unlocked).toBe(false);
  });

  it("retains pending work when the network fails during upload", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    w.fetcher.mockResolvedValueOnce(Response.json({ user: { id: "alice" } })).mockRejectedValueOnce(new TypeError("offline"));
    await expect(w.api.sync()).rejects.toThrow("Connection interrupted");
    expect((await w.api.read(`document:${base.path}`)).pending).toBe(true);
  });

  it("keys Flight snapshots by navigation state and ignores only cache-busting query values", async () => {
    const w = worker();
    const a = new Request("https://memoria.test/notes?_rsc=one", { headers: { rsc: "1", "next-router-state-tree": "tree-a" } });
    const b = new Request("https://memoria.test/notes?_rsc=two", { headers: { rsc: "1", "next-router-state-tree": "tree-a" } });
    const c = new Request("https://memoria.test/notes?_rsc=one", { headers: { rsc: "1", "next-router-state-tree": "tree-b" } });
    expect(await w.api.responseKey(a)).toBe(await w.api.responseKey(b));
    expect(await w.api.responseKey(a)).not.toBe(await w.api.responseKey(c));
    expect(await w.api.responseKey(a)).not.toBe(await w.api.responseKey(new Request("https://memoria.test/notes")));
  });

  it("leaves authentication traffic uncached and preserves server auth failures", async () => {
    const w = worker(); await w.enroll();
    expect(await w.fetchRequest(new Request("https://memoria.test/api/auth/session"))).toBeNull();
    w.fetcher.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await w.fetchRequest(new Request("https://memoria.test/notes")))?.status).toBe(401);
    expect([...w.records.keys()]).toEqual(["profile"]);
  });

  it("removes encrypted drafts and the profile together", async () => {
    const w = worker(); await w.enroll(); await w.seed(); await w.save();
    await w.api.command({ type: "REMOVE" });
    expect(w.records.size).toBe(0);
    expect(await w.api.command({ type: "STATUS" })).toMatchObject({ configured: false, unlocked: false });
  });

  it("resumes a suspended worker using a live tab's key, and revokes old resume keys on logout", async () => {
    const first = worker(); await first.enroll(); await first.seed(); await first.save();
    const { resume } = await first.message({ type: "STATUS" });
    const restarted = worker(first.records);
    expect((await restarted.api.command({ type: "STATUS" })).unlocked).toBe(false);
    expect((await restarted.message({ type: "STATUS", resume })).result?.unlocked).toBe(true);
    expect((await restarted.api.read(`document:${base.path}`)).content).toBe("Edited offline");
    await restarted.message({ type: "LOCK" });
    const afterLogout = worker(first.records);
    expect((await afterLogout.message({ type: "STATUS", resume })).result?.unlocked).toBe(false);
  });

  it("replays the exact saved Flight response and headers only while unlocked", async () => {
    const w = worker(); await w.enroll();
    w.fetcher.mockImplementation(async input => String(input) === "/api/auth/session"
      ? Response.json({ user: { id: "alice" } })
      : new Response("private-flight-data", { headers: { "content-type": "text/x-component", vary: "Next-Url", "x-nextjs-stale-time": "30" } }));
    const request = new Request("https://memoria.test/notes?_rsc=one", { headers: { rsc: "1", "next-router-state-tree": "tree-a" } });
    expect(await (await w.fetchRequest(request))?.text()).toBe("private-flight-data");
    w.fetcher.mockRejectedValue(new TypeError("offline"));
    const cached = await w.fetchRequest(request);
    expect(await cached?.text()).toBe("private-flight-data"); expect(cached?.headers.get("vary")).toBe("Next-Url");
    await w.api.command({ type: "LOCK" });
    expect(await (await w.fetchRequest(request))?.text()).not.toContain("private-flight-data");
  });

  it("does not replace synced local data with an older page snapshot", async () => {
    const w = worker(); await w.enroll();
    await w.api.command({ type: "DOCUMENT", document: { ...base, content: "Newer synced text", updatedAt: "2026-10-02T00:00:00.000Z" } });
    const restored = await w.api.command({ type: "DOCUMENT", document: base });
    expect(restored.content).toBe("Newer synced text");
  });

  it("uses a complete root-tree response for a new offline navigation context", async () => {
    const w = worker(); await w.enroll();
    w.fetcher.mockImplementation(async input => String(input) === "/api/auth/session"
      ? Response.json({ user: { id: "alice" } })
      : new Response("complete-root-tree", { headers: { "content-type": "text/x-component" } }));
    await w.fetchRequest(new Request("https://memoria.test/notes", { headers: { rsc: "1" } }));
    w.fetcher.mockRejectedValue(new TypeError("offline"));
    const fromAnotherPage = new Request("https://memoria.test/notes?_rsc=new", { headers: { rsc: "1", "next-router-state-tree": "another-page" } });
    const response = await w.fetchRequest(fromAnotherPage);
    expect(response?.headers.get("content-type")).toBe("text/x-component");
    expect(await response?.text()).toBe("complete-root-tree");
  });

  it("authenticates encrypted record names to reject swapped ciphertext", async () => {
    const w = worker(); await w.enroll(); await w.seed();
    w.records.set("document:/api/notes/n2", w.records.get(`document:${base.path}`));
    await expect(w.api.read("document:/api/notes/n2")).rejects.toThrow();
  });
});
