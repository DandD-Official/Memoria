/* eslint-env serviceworker */
/* Encrypted, device-local storage. No passwords, cookies, or session tokens are persisted here. */
const DB_NAME = "memoria-encrypted-offline-v1";
const ASSETS = "memoria-offline-assets-v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let vault = null;
let serial = Promise.resolve();
let syncing = null;
let preparing = null;
const privatePage = path => /^\/(dashboard|notes|reviewers|quizzes|books|notebooks|library|favorites|archive|study|workspaces|shared|progress|notifications|search|settings|diagrams)(\/|$)/.test(path);
const documentPath = path => /^\/api\/(notes|reviewers)\/[a-zA-Z0-9_-]+$/.test(path);
const readableApi = path => /^\/api\/(notes|reviewers|quizzes|flashcards|library|search|tags|revisions|notifications|diagrams|media|collections|workspaces)(\/|$)/.test(path) && !/\/(export|unlock|members)(\/|$)/.test(path);

function exclusive(task) {
  const result = serial.then(task, task);
  serial = result.catch(() => undefined);
  return result;
}

function database() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("records");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function record(mode, key, value) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("records", mode === "get" || mode === "keys" ? "readonly" : "readwrite");
      const store = tx.objectStore("records");
      const request = mode === "get" ? store.get(key) : mode === "keys" ? store.getAllKeys() : mode === "clear" ? store.clear() : mode === "delete" ? store.delete(key) : store.put(value, key);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Local storage could not commit."));
    });
  } finally { db.close(); }
}

async function derive(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function seal(key, name, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(name) }, key, encoder.encode(JSON.stringify(value)));
  return { iv, ciphertext };
}

async function unseal(key, name, value) {
  return JSON.parse(decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: value.iv, additionalData: encoder.encode(name) }, key, value.ciphertext)));
}

async function write(name, value, current = vault) {
  if (!current || current !== vault) throw new Error("Unlock offline access first.");
  const encrypted = await seal(current.key, name, value);
  if (current !== vault) throw new Error("Offline storage was locked.");
  await record("put", name, encrypted);
}

async function read(name, current = vault) {
  if (!current) return null;
  const value = await record("get", name);
  return value ? unseal(current.key, name, value) : null;
}

async function broadcast(data, except) {
  for (const client of await self.clients.matchAll({ type: "window" })) if (client.id !== except) client.postMessage(data);
}

async function session() {
  const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("Connect and sign in to your account first.");
  const data = await response.json();
  return data.user || null;
}

async function verifyAccount(current) {
  const user = await session();
  if (!user || user.id !== current.userId) {
    if (user && current === vault) vault = null;
    throw new Error("Sign in to the same account before syncing this device.");
  }
  return user;
}

async function status() {
  const profile = await record("get", "profile");
  const documents = vault ? await allDocuments() : [];
  return { configured: Boolean(profile), unlocked: Boolean(vault), pending: documents.filter(item => item.pending).length, conflicts: documents.filter(item => item.conflict).length };
}

async function allDocuments() {
  const keys = await record("keys");
  const documents = await Promise.all(keys.filter(key => key.startsWith("document:")).map(key => read(key)));
  return documents.filter(Boolean);
}

async function saveDocument(path, title, content, updatedAt) {
  if (!documentPath(path) || typeof title !== "string" || typeof content !== "string" || !title.trim() || title.length > 200 || !content) throw new Error("Add a title and content before saving.");
  const existing = await read(`document:${path}`);
  if (!existing) throw new Error("Open this document online with offline access unlocked before editing offline.");
  if (existing.title === title && existing.content === content) return existing;
  const next = { ...existing, updatedAt: existing.pending ? existing.updatedAt : updatedAt || existing.updatedAt, title, content, pending: true, revision: crypto.randomUUID() };
  await write(`document:${path}`, next);
  return next;
}

async function sync() {
  if (syncing) return syncing;
  syncing = (async () => {
    const current = vault;
    if (!current) return;
    await verifyAccount(current);
    for (const document of await allDocuments()) {
      if (current !== vault || !document.pending || document.conflict) continue;
      let response;
      try {
        response = await fetch("/api/offline/sync", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...document, userId: current.userId }) });
      } catch { return; }
      if (response.status === 401) return;
      const data = await response.json().catch(() => null);
      if (!response.ok && response.status !== 409) {
        await broadcast({ type: "OFFLINE_NOTICE", error: true, message: data?.error || "Sync could not complete. Your local changes are kept." });
        return;
      }
      await exclusive(async () => {
        if (current !== vault) return;
        const latest = await read(`document:${document.path}`);
        if (!latest) return;
        const next = response.status === 409
          ? { ...latest, conflict: true }
          : { ...latest, ...(latest.revision === document.revision ? { title: data.title ?? latest.title, content: data.content ?? latest.content } : {}), updatedAt: data.updatedAt, pending: latest.revision !== document.revision, conflict: false };
        await write(`document:${document.path}`, next);
        await broadcast({ type: "OFFLINE_DOCUMENT", document: next });
      });
      if (response.status === 409) await broadcast({ type: "OFFLINE_NOTICE", error: true, message: "Another device changed a document. Your draft is kept; open it to review before syncing." });
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

async function responseKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete("_rsc");
  // Flight patches depend on the router tree. Never replay a patch from a
  // different navigation context or confuse a prefetch with a full response.
  const context = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url"].map(name => request.headers.get(name) || "").join("\n");
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(context));
  return `page:${url.pathname}${url.search}:${Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("")}`;
}

async function cacheResponse(request, response, current) {
  if (!current || current !== vault || !response.ok || response.redirected) return;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/x-component")) return;
  const text = await response.text();
  const headers = { "Content-Type": type, "Cache-Control": "no-store" };
  for (const name of ["vary", "x-nextjs-postponed", "x-nextjs-stale-time"]) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  await write(await responseKey(request), { text, type, headers }, current);
  // Preload scripts/styles in full documents so a first offline reload does
  // not depend on an HTTP cache that the browser is free to discard.
  if (type.includes("text/html")) await cacheAssets(text);
}

async function cacheAssets(html) {
  const references = [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
  const urls = references.filter(path => path.startsWith("/_next/static/") || path.startsWith("/brand/") || path.startsWith("/icon.svg"));
  const cache = await caches.open(ASSETS);
  await Promise.all([...new Set(urls)].map(async path => {
    if (await cache.match(path)) return;
    const response = await fetch(path);
    if (!response.ok) throw new Error("Some page files could not be saved. Reconnect and retry offline preparation.");
    await cache.put(path, response);
  }));
  if (vault) {
    const media = references.filter(path => /^\/api\/media\/[a-zA-Z0-9_-]+$/.test(path) || /^\/api\/diagrams\/[a-zA-Z0-9_-]+\/preview$/.test(path));
    for (const path of new Set(media)) await cachedApi(new Request(new URL(path, self.location.origin)));
  }
}

async function prepareLogin() {
  const response = await fetch("/login", { cache: "reload" });
  if (!response.ok || response.redirected) throw new Error("Could not prepare the login page.");
  await cacheAssets(await response.clone().text());
  await (await caches.open(ASSETS)).put("/login", response);
}

async function capture(path) {
  const url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin || !privatePage(url.pathname) || !vault) return;
  const current = vault;
  await verifyAccount(current);
  const request = new Request(url, { credentials: "same-origin", headers: { Accept: "text/html" } });
  const response = await fetch(request);
  if (!response.ok || response.redirected) throw new Error("A page could not be prepared. Sign in online and retry.");
  await cacheResponse(request, response, current);
  // Without a router-state header, Next sends the complete root tree. Unlike
  // a context-specific patch, this can be applied from any of this app's
  // ordinary routes, retaining its existing client navigation/transitions.
  // This app has no intercepted/parallel routes; revisit this fallback if added.
  const flight = new Request(url, { credentials: "same-origin", cache: "no-store", headers: { RSC: "1" } });
  const flightResponse = await fetch(flight);
  if (flightResponse.ok && !flightResponse.redirected) await cacheResponse(flight, flightResponse, current);
}

async function prepare() {
  if (preparing) return preparing;
  preparing = (async () => {
    const current = vault;
    if (!current) throw new Error("Unlock offline access first.");
    await prepareLogin();
    const response = await fetch("/api/offline/manifest", { cache: "no-store" });
    if (!response.ok) throw new Error("Sign in online to prepare your library.");
    const manifest = await response.json();
    if (manifest.userId !== current.userId) throw new Error("Sign in to the same account to prepare offline access.");
    for (const path of manifest.paths) {
      if (vault !== current) return;
      await capture(path);
    }
    await broadcast({ type: "OFFLINE_NOTICE", message: "Your notes and reviewers are ready on this device. Other pages save when you open them." });
  })().finally(() => { preparing = null; });
  return preparing;
}

async function cachedApi(request) {
  const current = vault;
  const name = `api:${request.url}`;
  let response;
  try { response = await fetch(request); }
  catch {
    const saved = await read(name).catch(() => null);
    if (!saved) return Response.json({ error: vault ? "Open this content online first to save it on this device." : "Unlock offline access to open saved content." }, { status: 503 });
    return new Response(new Uint8Array(saved.bytes), { headers: { "Content-Type": saved.type, "Cache-Control": "no-store" } });
  }
  if (current && response.ok && !response.redirected) {
    try {
      await verifyAccount(current);
      const bytes = new Uint8Array(await response.clone().arrayBuffer());
      if (bytes.length <= 10_000_000) await write(name, { bytes: Array.from(bytes), type: response.headers.get("content-type") || "application/octet-stream" }, current);
    } catch { /* A failed local write must not fail the online request. */ }
  }
  return response;
}

async function command(data) {
  if (data.type === "STATUS") return status();
  if (data.type === "ENROLL") {
    if (await record("get", "profile")) throw new Error("Offline storage already exists. Unlock it with its passphrase.");
    if (typeof data.passphrase !== "string" || data.passphrase.length < 12) throw new Error("Use an offline passphrase with at least 12 characters.");
    const user = await session();
    if (!user) throw new Error("Sign in online before enabling offline access.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await derive(data.passphrase, salt);
    const identity = { userId: user.id, email: user.email };
    const resumeId = crypto.randomUUID();
    await record("put", "profile", { salt, identity: await seal(key, "identity", identity), resumeId });
    vault = { ...identity, key, resumeId };
    return true;
  }
  if (data.type === "UNLOCK") {
    const profile = await record("get", "profile");
    if (!profile) throw new Error("Enable offline access in Settings while connected first.");
    let key, identity;
    try {
      key = await derive(data.passphrase, profile.salt);
      identity = await unseal(key, "identity", profile.identity);
      if (data.email && data.email.toLowerCase().trim() !== identity.email.toLowerCase().trim()) throw new Error();
    } catch { throw new Error("That email or offline passphrase does not match this device."); }
    // Offline unlock grants local access only; it never creates a server session.
    vault = { ...identity, key, resumeId: profile.resumeId };
    return true;
  }
  if (data.type === "LOCK") {
    vault = null;
    const profile = await record("get", "profile");
    if (profile) await record("put", "profile", { ...profile, resumeId: crypto.randomUUID() });
    await broadcast({ type: "OFFLINE_LOCKED" }, data.clientId);
    return true;
  }
  if (data.type === "REMOVE") { vault = null; await record("clear"); await broadcast({ type: "OFFLINE_LOCKED" }, data.clientId); return true; }
  if (data.type === "DOCUMENT") {
    if (!vault) return null;
    const document = data.document;
    if (!documentPath(document.path)) throw new Error("Unsupported document.");
    const existing = await read(`document:${document.path}`);
    if (existing && (existing.pending || existing.updatedAt >= document.updatedAt)) return existing;
    await write(`document:${document.path}`, document);
    return document;
  }
  if (data.type === "SAVE_DOCUMENT") return saveDocument(data.path, data.title, data.content, data.updatedAt);
  if (data.type === "PULL_DOCUMENT") {
    if (!vault || !documentPath(data.path)) return;
    const existing = await read(`document:${data.path}`);
    if (!existing || existing.pending) return;
    await verifyAccount(vault);
    const response = await fetch(data.path, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    const document = payload.note || payload.reviewer;
    if (!document || document.updatedAt === existing.updatedAt) return;
    const next = { path: data.path, title: document.title, content: document.content, updatedAt: document.updatedAt, pending: false };
    await write(`document:${data.path}`, next);
    await broadcast({ type: "OFFLINE_DOCUMENT", document: next });
    return;
  }
  if (data.type === "LOAD_REMOTE") {
    if (!vault || !documentPath(data.path)) throw new Error("Unlock offline access first.");
    await verifyAccount(vault);
    const response = await fetch(data.path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the online document. Your local draft is kept.");
    const payload = await response.json();
    const document = payload.note || payload.reviewer;
    const next = { path: data.path, title: document.title, content: document.content, updatedAt: document.updatedAt, pending: false, conflict: false };
    await write(`document:${data.path}`, next);
    return next;
  }
  throw new Error("Unknown offline operation.");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await prepareLogin();
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("message", event => {
  // Only same-origin window clients can operate the vault.
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil((async () => {
    try {
      const data = event.data;
      data.clientId = event.source.id;
      // A live tab may resume after the browser suspends the worker. Keys are
      // structured-cloned in memory only, never written to IndexedDB.
      await exclusive(async () => {
        if (!vault && data.resume && !["LOCK", "REMOVE", "ENROLL", "UNLOCK"].includes(data.type)) {
          const profile = await record("get", "profile");
          if (profile && profile.resumeId === data.resume.id) {
            const identity = await unseal(data.resume.key, "identity", profile.identity);
            vault = { ...identity, key: data.resume.key, resumeId: profile.resumeId };
          }
        }
      });
      const result = data.type === "PREPARE" ? true : data.type === "SYNC" ? await sync() : data.type === "CAPTURE" ? await capture(data.path) : await exclusive(() => command(data));
      event.ports[0]?.postMessage({ result, resume: vault ? { key: vault.key, id: vault.resumeId } : null });
      if (data.type === "SAVE_DOCUMENT") await sync().catch(() => undefined);
      if (data.type === "PREPARE") await prepare().catch(error => broadcast({ type: "OFFLINE_NOTICE", error: true, message: `${error.message} Pages already saved are kept; unlock offline access in Settings to retry preparation.` }));
    } catch (error) { event.ports[0]?.postMessage({ error: error.message || "Offline storage failed." }); }
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.method === "GET" && url.pathname === "/offline" && request.mode === "navigate") {
    event.respondWith(Response.redirect(new URL("/login?offline=1", self.location.origin)));
    return;
  }
  if (request.method === "GET" && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname === "/icon.svg")) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  if (request.method === "GET" && url.pathname === "/login" && request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await (await caches.open(ASSETS)).match("/login")) || Response.error()));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/signout") vault = null;
  if (request.method === "GET" && readableApi(url.pathname)) {
    event.respondWith(cachedApi(request));
    return;
  }
  if (request.method === "PATCH" && documentPath(url.pathname) && vault) {
    const saved = (async () => {
      const body = await request.clone().json().catch(() => null);
      if (!body || typeof body.title !== "string" || typeof body.content !== "string" || Object.keys(body).some(key => !["title", "content"].includes(key))) return fetch(request);
      try {
        const document = await exclusive(() => saveDocument(url.pathname, body.title, body.content));
        return Response.json({ savedLocally: true, document }, { status: 202 });
      } catch (error) { return Response.json({ error: error.message }, { status: 503 }); }
    })();
    event.respondWith(saved);
    event.waitUntil(saved.then(() => sync()).catch(() => undefined));
    return;
  }
  if (request.method !== "GET" || !privatePage(url.pathname)) return;
  const current = vault;
  const work = (async () => {
    let response;
    try {
      response = await fetch(request);
    } catch {
      if (!vault) {
        if (request.mode === "navigate") return Response.redirect(new URL("/login?offline=1", self.location.origin));
        return new Response("", { headers: { "Content-Type": "text/html" } });
      }
      let cached = await read(await responseKey(request)).catch(() => null);
      if (!cached && request.headers.get("rsc") && !request.headers.has("next-router-segment-prefetch")) {
        const fullTreeRequest = new Request(request.url, { headers: { RSC: "1" } });
        cached = await read(await responseKey(fullTreeRequest)).catch(() => null);
      }
      if (cached) return new Response(cached.text, { headers: cached.headers || { "Content-Type": cached.type, "Cache-Control": "no-store" } });
      // If neither an exact patch nor a complete tree exists, ask Next to
      // load the saved document. Never replay another route's partial patch.
      if (request.headers.get("rsc")) return new Response("", { headers: { "Content-Type": "text/html" } });
      return Response.redirect(new URL("/login?offline=1&missing=1", self.location.origin));
    }
    // Storage failures must never disguise a successful online response or
    // replace an auth redirect/permission failure with stale private content.
    if (current) {
      try { await verifyAccount(current); await cacheResponse(request, response.clone(), current); }
      catch { /* The network response remains authoritative. */ }
    }
    return response;
  })();
  event.respondWith(work);
});
