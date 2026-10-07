const CACHE_NAME = "memoria-shell-v2";
const OFFLINE_URL = "/offline";

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!page.ok) throw new Error("Could not cache the offline library page.");
  await cache.put(OFFLINE_URL, page.clone());
  const html = await page.text();
  const urls = new Set(["/icon.svg", "/icon-192-v2.png", "/icon-512-v2.png"]);
  for (const match of html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)) {
    urls.add(new URL(match[1], self.location.origin).href);
  }
  await Promise.all([...urls].map(async url => {
    try { const response = await fetch(url, { cache: "reload" }); if (response.ok) await cache.put(url, response); } catch { /* A later visit can fill optional assets. */ }
  }));
}

self.addEventListener("install", event => {
  event.waitUntil(precacheShell().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("memoria-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timeout = self.setTimeout(() => controller.abort(), 4500);
      try { return await fetch(request, { signal: controller.signal }); }
      catch {
      if (url.pathname === OFFLINE_URL) return (await caches.match(OFFLINE_URL)) || new Response("Connect once to save the offline library to this device.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      const fallback = new URL(OFFLINE_URL, self.location.origin);
      fallback.searchParams.set("path", url.pathname + url.search);
      return Response.redirect(fallback.href, 302);
      } finally { self.clearTimeout(timeout); }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      const update = fetch(request).then(response => { if (response.ok) void cache.put(request, response.clone()); return response; }).catch(() => null);
      if (cached) { void update; return cached; }
      return (await update) || Response.error();
    }));
  }
});
