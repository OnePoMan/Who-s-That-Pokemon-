// Every drawing made or watched on this device, kept in IndexedDB for the Pokédex.
// Metadata and images are separate stores so listing the collection never loads the images.
import type { RoundOutcome } from './game-state';

export type DrawingSource = 'one-phone' | 'multi-phone' | 'solo' | 'daily';

export interface CollectedDrawing {
  id: number;
  pokemonId: number;
  pokemonName: string;
  artist: string;
  source: DrawingSource;
  outcome: RoundOutcome | 'done';
  drawnAt: number;
}

const DB_NAME = 'wtp-pokedex';
const DB_VERSION = 1;
const META = 'drawings';
const IMAGES = 'images';
/** Oldest drawings are dropped past this, so the collection can't fill the phone. */
export const MAX_DRAWINGS = 1000;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) {
        const store = db.createObjectStore(META, { keyPath: 'id', autoIncrement: true });
        store.createIndex('pokemonId', 'pokemonId');
      }
      if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  }).catch((err) => {
    dbPromise = null; // try again next time (e.g. after a private-mode refusal is lifted)
    throw err;
  });
  return dbPromise;
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });

const result = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** Decodes a data: URL without fetch() (which the content security policy doesn't allow). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',');
  const type = /data:([^;,]+)/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

let persistAsked = false;

/** Saves a drawing and returns its ID, or null if storage is unavailable. */
export async function addDrawing(entry: Omit<CollectedDrawing, 'id'>, dataUrl: string): Promise<number | null> {
  try {
    const db = await openDb();
    const tx = db.transaction([META, IMAGES], 'readwrite');
    const id = (await result(tx.objectStore(META).add(entry))) as number;
    tx.objectStore(IMAGES).put(dataUrlToBlob(dataUrl), id);
    await done(tx);
    if (!persistAsked) {
      persistAsked = true;
      // Asks the browser not to evict the collection under storage pressure (a hint only).
      void navigator.storage?.persist?.().catch(() => {});
    }
    void prune(db);
    return id;
  } catch {
    return null;
  }
}

async function prune(db: IDBDatabase) {
  const tx = db.transaction([META, IMAGES], 'readwrite');
  const keys = (await result(tx.objectStore(META).getAllKeys())) as number[];
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_DRAWINGS))) {
    tx.objectStore(META).delete(key);
    tx.objectStore(IMAGES).delete(key);
  }
  await done(tx);
}

/** Every drawing's details, newest first. */
export async function listDrawings(): Promise<CollectedDrawing[]> {
  try {
    const db = await openDb();
    const all = (await result(db.transaction(META).objectStore(META).getAll())) as CollectedDrawing[];
    return all.reverse();
  } catch {
    return [];
  }
}

export async function getDrawingImage(id: number): Promise<Blob | null> {
  try {
    const db = await openDb();
    return ((await result(db.transaction(IMAGES).objectStore(IMAGES).get(id))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteDrawing(id: number): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, IMAGES], 'readwrite');
  tx.objectStore(META).delete(id);
  tx.objectStore(IMAGES).delete(id);
  await done(tx);
}

export async function clearDrawings(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, IMAGES], 'readwrite');
  tx.objectStore(META).clear();
  tx.objectStore(IMAGES).clear();
  await done(tx);
}
