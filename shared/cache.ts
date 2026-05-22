const MAX_MEMORY_CACHE = 2000;
const DB_NAME = 'polyglot_cache';
const DB_VERSION = 2;
const STORE_NAME = 'translations';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  value: string;
  ts: number;
}

/** Simple LRU cache using Map (keys maintain insertion order on re-access) */
class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

const memoryCache = new LRUCache<string, CacheEntry>(MAX_MEMORY_CACHE);

export function makeCacheKey(text: string, source: string, target: string): string {
  return `${source}:${target}:${text.trim()}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheGet(key: string): Promise<string | undefined> {
  const mem = memoryCache.get(key);
  if (mem !== undefined) {
    if (Date.now() - mem.ts > CACHE_TTL_MS) {
      memoryCache.delete(key);
    } else {
      return mem.value;
    }
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await new Promise<CacheEntry | undefined>((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (result !== undefined) {
      if (Date.now() - result.ts > CACHE_TTL_MS) {
        // Expired — delete from IndexedDB in background
        cacheDelete(key).catch(() => {});
        return undefined;
      }
      memoryCache.set(key, result);
      return result.value;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function cacheSet(key: string, value: string): Promise<void> {
  const entry: CacheEntry = { value, ts: Date.now() };
  memoryCache.set(key, entry);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry, key);
    db.close();
  } catch {
    // IndexedDB write failed, cache is still in memory
  }
}

async function cacheDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    db.close();
  } catch {
    // Ignore
  }
}

export async function cacheGetBatch(
  texts: string[],
  source: string,
  target: string,
): Promise<Map<string, string | undefined>> {
  const result = new Map<string, string | undefined>();
  for (const text of texts) {
    const key = makeCacheKey(text, source, target);
    result.set(text, await cacheGet(key));
  }
  return result;
}

export async function cacheSetBatch(
  translations: Map<string, string>,
  source: string,
  target: string,
): Promise<void> {
  for (const [original, translated] of translations) {
    const key = makeCacheKey(original, source, target);
    await cacheSet(key, translated);
  }
}

export async function cacheClear(): Promise<void> {
  memoryCache.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    db.close();
  } catch {
    // Ignore
  }
}
