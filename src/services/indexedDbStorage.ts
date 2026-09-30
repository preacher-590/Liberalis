/**
 * Service de stockage asynchrone IndexedDB natif (IndexedDB Storage Driver)
 *
 * Rôles :
 * 1. Supprime la limite de 5 Mo du localStorage en offrant un stockage volumineux
 *    adapté aux historiques complets de consultations, patients et pièces comptables.
 * 2. Effectue les écritures et lectures en arrière-plan sans bloquer le thread principal UI (Zéro Jank).
 * 3. Propose un fallback automatique et transparent vers localStorage si IndexedDB
 *    est bloqué ou non supporté.
 */

const DB_NAME = 'liberalis_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Ouvre ou récupère l'instance ouverte de la base de données IndexedDB.
 */
function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté dans cet environnement.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.info(`[IndexedDB] Object store '${STORE_NAME}' créé avec succès.`);
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbPromise = null;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.warn('[IndexedDB] Erreur ouverture base de données:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export const indexedDbStorage = {
  /**
   * Enregistre une valeur associée à une clé dans IndexedDB (ou localStorage en secours).
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await getDatabase();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback localStorage
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`[IndexedDB Fallback] Échec écriture localStorage pour ${key}:`, e);
      }
    }
  },

  /**
   * Récupère une valeur par sa clé depuis IndexedDB (ou localStorage en secours).
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await getDatabase();
      return new Promise<string | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result;
          if (result !== undefined && result !== null) {
            resolve(result as string);
          } else {
            // Secours localStorage si la donnée n'a pas encore été migrée vers IndexedDB
            resolve(localStorage.getItem(key));
          }
        };

        req.onerror = () => {
          resolve(localStorage.getItem(key));
        };
      });
    } catch {
      // Fallback direct localStorage
      return localStorage.getItem(key);
    }
  },

  /**
   * Supprime une clé spécifique.
   */
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      const db = await getDatabase();
      return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      localStorage.removeItem(key);
    }
  },

  /**
   * Vide entièrement la base IndexedDB et les clés du cache.
   */
  async clear(): Promise<void> {
    try {
      const db = await getDatabase();
      return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // Ignore
    }
  },
};
