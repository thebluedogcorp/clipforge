"use client";

/**
 * IndexedDB-backed persistence for the ClipForge project state.
 * Stores:
 *   - "state": serializable app state (clips, captions, transcript, source metadata, etc.)
 *   - "file": the raw video File/Blob (only for local-file sources — YouTube uses a URL)
 *
 * On load, the persisted state is restored and the object URL is re-created
 * from the stored blob so the user can continue exactly where they left off.
 */

const DB_NAME = "clipforge";
const STORE = "kv";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface PersistedState {
  clips: import("@/lib/types").Clip[];
  captions: import("@/lib/types").CaptionSegment[];
  transcript: string | null;
  source: Omit<import("@/lib/types").VideoSource, "url"> | null;
  fileBlobKey: string | null;
  aspect: "16:9" | "9:16" | "1:1" | "4:5";
  captionStyle: "minimal" | "bold" | "karaoke" | "boxed";
  captionColor: string;
  captionSize: number;
  captionPosition: number;
  savedAt: number;
}

export const persistence = {
  async getState(): Promise<PersistedState | undefined> {
    return idbGet<PersistedState>("state");
  },
  async setState(state: PersistedState): Promise<void> {
    await idbSet("state", state);
  },
  async getFile(key = "file"): Promise<Blob | undefined> {
    return idbGet<Blob>(key);
  },
  async setFile(file: Blob, key = "file"): Promise<void> {
    await idbSet(key, file);
  },
  async clear(): Promise<void> {
    await idbDel("state");
    await idbDel("file");
  },
};
