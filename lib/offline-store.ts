export interface OfflineSnapshot {
  account: { id: string; name: string };
  syncedAt: string;
  notes: Array<{ id: string; title: string; description?: string | null; content: string; sourceType: string; updatedAt: string; isFavorite?: boolean; archivedAt?: string | null }>;
  reviewers: Array<{ id: string; title: string; description?: string | null; content: string; style: string; updatedAt: string; isFavorite?: boolean; archivedAt?: string | null }>;
  quizzes: Array<{ id: string; title: string; description?: string | null; mode: string; questions: unknown; configuration: unknown; updatedAt: string; isFavorite?: boolean; archivedAt?: string | null }>;
  diagrams: Array<{ id: string; title: string; data: unknown; updatedAt: string }>;
  collections: Array<{ id: string; title: string; subtitle?: string | null; description?: string | null; tocTitle: string; kind: string; subjects: unknown; items: Array<{ id: string; resourceType: string; resourceId: string; subjectId?: string | null; position: number }>; updatedAt: string }>;
  flashcards: Array<{ id: string; reviewerId?: string | null; front: string; back: string }>;
  progress: Array<{ flashcardId: string; dueAt: string; repetitions: number; lapses: number }>;
  tags: Array<{ id: string; name: string; color?: string | null }>;
  media: Record<string, string>;
}

const DATABASE = "memoria-offline-v1";
const STORE = "account-snapshots";
const ACTIVE_ACCOUNT = "memoria:offline-account";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "account.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

export function activeOfflineAccount(): string | null {
  try { return typeof localStorage === "undefined" ? null : localStorage.getItem(ACTIVE_ACCOUNT); }
  catch { return null; }
}

export function setActiveOfflineAccount(accountId: string): void {
  try { localStorage.setItem(ACTIVE_ACCOUNT, accountId); } catch { /* The persistent database can still be read in this session. */ }
}

export async function readOfflineSnapshot(accountId = activeOfflineAccount()): Promise<OfflineSnapshot | null> {
  if (!accountId || typeof indexedDB === "undefined") return null;
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(accountId);
      request.onsuccess = () => resolve((request.result as OfflineSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read the offline copy."));
    });
  } finally { db.close(); }
}

export async function saveOfflineSnapshot(snapshot: OfflineSnapshot): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("Offline storage is unavailable in this browser.");
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline copy."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline storage is full."));
    });
    setActiveOfflineAccount(snapshot.account.id);
  } finally { db.close(); }
}

export async function removeOfflineSnapshot(accountId = activeOfflineAccount()): Promise<void> {
  if (!accountId || typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(accountId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the offline copy."));
    });
    if (activeOfflineAccount() === accountId) { try { localStorage.removeItem(ACTIVE_ACCOUNT); } catch { /* The deleted database record is no longer accessible. */ } }
  } finally { db.close(); }
}
