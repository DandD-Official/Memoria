// Private data and keys live in the worker. Never put credentials in Web Storage.
let registration: Promise<ServiceWorkerRegistration> | undefined;
let resume: { key: CryptoKey; id: string } | undefined;

export function forgetOfflineKey() { resume = undefined; }

export async function offlineWorker() {
  if (process.env.NODE_ENV !== "production") throw new Error("Offline access requires a production build. Run npm run build and npm start to test it.");
  if (!("serviceWorker" in navigator) || !window.isSecureContext) throw new Error("Offline storage requires HTTPS and a browser with service worker support.");
  registration ??= navigator.serviceWorker.register("/offline-worker.js", { scope: "/", updateViaCache: "none" });
  await registration;
  const ready = await navigator.serviceWorker.ready;
  return navigator.serviceWorker.controller ?? ready.active!;
}

export async function offlineCommand<T = unknown>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  const worker = await offlineWorker();
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error("Offline storage did not respond. Try unlocking it again.")); }, 30_000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (data.error) reject(new Error(data.error));
      else { resume = data.resume ?? undefined; resolve(data.result as T); }
    };
    worker.postMessage({ type, ...payload, resume }, [channel.port2]);
  });
}

export type OfflineStatus = { configured: boolean; unlocked: boolean; pending: number; conflicts: number };
export type OfflineDocument = { path: string; title: string; content: string; updatedAt: string; pending?: boolean; conflict?: boolean };

export async function lockOffline() {
  if (process.env.NODE_ENV !== "production") return;
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
  await offlineCommand("LOCK");
}
