// src/platform/store-idb — a tiny promise wrapper over IndexedDB for the
// GROWING stores (audit §3.1/§8 W2): append-only production memory (Captain's
// Log, chat) that doesn't belong in the 5 MB synchronous localStorage. Every
// call degrades to a no-op/empty when IndexedDB is unavailable — persistence
// is memory, never a dependency.

const DB = 'spog';
const VERSION = 1;
export type StoreName = 'log' | 'chat';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('log')) d.createObjectStore('log', { keyPath: 'k' });
        if (!d.objectStoreNames.contains('chat')) d.createObjectStore('chat', { keyPath: 'k' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

/** Put one record (must carry its own `k` key). Fire-and-forget safe. */
export async function idbPut(store: StoreName, value: { k: string } & Record<string, unknown>): Promise<void> {
  const d = await db();
  if (!d) return;
  try { d.transaction(store, 'readwrite').objectStore(store).put(value); } catch { /* quota / closing */ }
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const d = await db();
  if (!d) return [];
  return new Promise((resolve) => {
    try {
      const req = d.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as T[]);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const d = await db();
  if (!d) return;
  try { d.transaction(store, 'readwrite').objectStore(store).delete(key); } catch { /* ignore */ }
}

export async function idbClear(store: StoreName): Promise<void> {
  const d = await db();
  if (!d) return;
  try { d.transaction(store, 'readwrite').objectStore(store).clear(); } catch { /* ignore */ }
}
