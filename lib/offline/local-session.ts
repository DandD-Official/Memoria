const LOCAL_SESSION = "memoria-offline-session";

// This flag only controls client UI. Server authentication remains authoritative.
export function isLocalSession() {
  try { return window.sessionStorage.getItem(LOCAL_SESSION) === "1"; } catch { return false; }
}

export function setLocalSession(local: boolean) {
  try { if (local) window.sessionStorage.setItem(LOCAL_SESSION, "1"); else window.sessionStorage.removeItem(LOCAL_SESSION); } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event("memoria:connection"));
}

export function canCheckOnlineSession() { return navigator.onLine && !isLocalSession(); }
