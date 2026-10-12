// Run before hydration: stale development chunks can prevent React effects from running.
// Only remove Memoria's service workers and asset caches. IndexedDB drafts stay intact.
export const DEV_OFFLINE_RECOVERY_SCRIPT = `
(async () => {
  if (!("serviceWorker" in navigator)) return;
  const owned = worker => {
    if (!worker) return false;
    const url = new URL(worker.scriptURL);
    return url.origin === location.origin && ["/offline-worker.js", "/sw.js"].includes(url.pathname);
  };
  const controlled = owned(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter(registration =>
    [registration.active, registration.waiting, registration.installing].some(owned)
  ).map(registration => registration.unregister()));
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter(name =>
      name.startsWith("memoria-offline-assets-") || name.startsWith("memoria-shell-")
    ).map(name => caches.delete(name)));
  }
  if (controlled) location.reload();
})().catch(error => console.error("Development cache recovery failed", error));
`;
