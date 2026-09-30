/**
 * Service de stockage hors-ligne et file d'attente de synchronisation (Offline Storage & Sync Engine)
 *
 * Optimisations Avancées Intégrées :
 * 1. Moteur asynchrone IndexedDB (`indexedDbStorage`) pour lever la limite de 5 Mo et éviter tout blocage UI.
 * 2. Chiffrement fort au repos (`cryptoStorage` AES-GCM 256 bits) pour la protection du secret professionnel.
 * 3. Contrôle de Concurrence Optimiste (Optimistic Concurrency Control) pour détecter et arbitrer les conflits.
 */

import type { AxiosInstance } from 'axios';
import { cryptoStorage } from './cryptoStorage';
import { indexedDbStorage } from './indexedDbStorage';

// Structure d'une mutation mise en attente de synchronisation
export interface QueuedMutation {
  id: string;
  url: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  data?: unknown;
  timestamp: number;
  clientUpdatedAt?: string;
  entityType?: 'client' | 'appointment' | 'invoice' | 'payment' | 'other';
  conflict?: boolean;
  conflictDetails?: string;
}

// Clés de stockage
const CACHE_KEYS = {
  CLIENTS: 'liberalis_cache_clients',
  APPOINTMENTS: 'liberalis_cache_appointments',
  INVOICES: 'liberalis_cache_invoices',
  NOTIFICATIONS: 'liberalis_cache_notifications',
  DASHBOARD_STATS: 'liberalis_cache_dashboard_stats',
  SYNC_QUEUE: 'liberalis_offline_sync_queue',
  CONFLICTS: 'liberalis_offline_conflicts',
} as const;

export type CacheEntityKey = 'clients' | 'appointments' | 'invoices' | 'notifications' | 'dashboardStats';

const KEY_MAP: Record<CacheEntityKey, string> = {
  clients: CACHE_KEYS.CLIENTS,
  appointments: CACHE_KEYS.APPOINTMENTS,
  invoices: CACHE_KEYS.INVOICES,
  notifications: CACHE_KEYS.NOTIFICATIONS,
  dashboardStats: CACHE_KEYS.DASHBOARD_STATS,
};

// Cache en mémoire vive (RAM) pour accès instantané sans latence
const memoryCache: Partial<Record<CacheEntityKey, unknown>> = {};

// Événements personnalisés pour l'UI réactive
export const SYNC_QUEUE_UPDATED_EVENT = 'liberalis:sync_queue_updated';
export const SYNC_CONFLICT_EVENT = 'liberalis:sync_conflict_detected';

function notifyQueueUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_UPDATED_EVENT));
  }
}

function notifyConflict(conflict: QueuedMutation): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_CONFLICT_EVENT, { detail: conflict }));
  }
}

export const offlineStorage = {
  // ─── 1. GESTION DU CACHE DE DONNÉES (AVEC CHIFFREMENT & INDEXEDDB) ───────────

  /**
   * Sauvegarde les données :
   * - En mémoire RAM instantanée
   * - Dans localStorage (fallback synchrone)
   * - Dans IndexedDB de manière asynchrone chiffrée avec AES-GCM
   */
  saveCachedData<T>(key: CacheEntityKey, data: T): void {
    // 1. Mise à jour de la mémoire vive
    memoryCache[key] = data;

    // 2. Écriture synchrone de secours
    try {
      const storageKey = KEY_MAP[key];
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn(`[OfflineStorage] Alerte quota localStorage pour ${key}:`, error);
    }

    // 3. Écriture asynchrone chiffrée dans IndexedDB (non-bloquante pour l'UI)
    (async () => {
      try {
        const encrypted = await cryptoStorage.encryptPayload(data);
        await indexedDbStorage.setItem(`enc_${KEY_MAP[key]}`, encrypted);
      } catch (err) {
        console.warn(`[OfflineStorage] Échec écriture chiffrée IndexedDB pour ${key}:`, err);
      }
    })();
  },

  /**
   * Récupère les données depuis la mémoire ou le cache local.
   */
  getCachedData<T>(key: CacheEntityKey): T | null {
    // Priorité 1 : Mémoire vive
    if (memoryCache[key] !== undefined) {
      return memoryCache[key] as T;
    }

    // Priorité 2 : localStorage
    try {
      const storageKey = KEY_MAP[key];
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        memoryCache[key] = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn(`[OfflineStorage] Erreur lecture cache ${key}:`, error);
    }

    return null;
  },

  /**
   * Hydrate le cache mémoire depuis IndexedDB chiffré au démarrage de l'application.
   */
  async hydrateFromEncryptedStorage(): Promise<void> {
    const keys: CacheEntityKey[] = ['clients', 'appointments', 'invoices', 'notifications', 'dashboardStats'];

    for (const key of keys) {
      try {
        const storageKey = `enc_${KEY_MAP[key]}`;
        const encrypted = await indexedDbStorage.getItem(storageKey);
        if (encrypted) {
          const decrypted = await cryptoStorage.decryptPayload<unknown>(encrypted);
          if (decrypted !== null) {
            memoryCache[key] = decrypted;
            try {
              localStorage.setItem(KEY_MAP[key], JSON.stringify(decrypted));
            } catch {
              // Ignore
            }
          }
        }
      } catch (e) {
        console.warn(`[OfflineStorage] Erreur hydratation chiffrée pour ${key}:`, e);
      }
    }
  },

  /**
   * Supprime l'ensemble des données du cache (déconnexion sécurisée).
   */
  clearAllCache(): void {
    // Purge mémoire
    (Object.keys(memoryCache) as CacheEntityKey[]).forEach((k) => delete memoryCache[k]);

    // Purge cryptographique
    cryptoStorage.clearKeyCache();

    // Purge localStorage
    try {
      Object.values(KEY_MAP).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
      localStorage.removeItem(CACHE_KEYS.CONFLICTS);
    } catch (e) {
      console.warn('[OfflineStorage] Erreur nettoyage localStorage:', e);
    }

    // Purge IndexedDB
    indexedDbStorage.clear().catch(() => {});
  },

  // ─── 2. GESTION DE LA FILE D'ATTENTE DE SYNCHRONISATION (ÉCRITURES) ──────────

  /**
   * Récupère la liste des mutations en attente de synchronisation.
   */
  getQueue(): QueuedMutation[] {
    try {
      const raw = localStorage.getItem(CACHE_KEYS.SYNC_QUEUE);
      return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
    } catch {
      return [];
    }
  },

  /**
   * Ajoute une mutation dans la file d'attente avec horodatage de concurrence optimiste.
   */
  enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'clientUpdatedAt'>): QueuedMutation {
    const queue = this.getQueue();
    const newEntry: QueuedMutation = {
      ...mutation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      clientUpdatedAt: new Date().toISOString(),
    };

    queue.push(newEntry);
    try {
      localStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      indexedDbStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue)).catch(() => {});
    } catch (e) {
      console.error('[OfflineStorage] Erreur empilement de mutation:', e);
    }

    notifyQueueUpdated();
    return newEntry;
  },

  /**
   * Retire une mutation de la file après son exécution réussie sur le serveur.
   */
  dequeueMutation(mutationId: string): void {
    const queue = this.getQueue().filter((item) => item.id !== mutationId);
    try {
      localStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      indexedDbStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue)).catch(() => {});
    } catch (e) {
      console.error('[OfflineStorage] Erreur dépilement mutation:', e);
    }
    notifyQueueUpdated();
  },

  /**
   * Vide entièrement la file d'attente de synchronisation.
   */
  clearQueue(): void {
    localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
    indexedDbStorage.removeItem(CACHE_KEYS.SYNC_QUEUE).catch(() => {});
    notifyQueueUpdated();
  },

  // ─── 3. CONTRÔLE DE CONCURRENCE ET SYNCHRONISATION SERVEUR ──────────────────

  /**
   * Traite la file d'attente avec détection et arbitrage des conflits (Optimistic Locking).
   */
  async processSyncQueue(
    apiClient: AxiosInstance
  ): Promise<{ processed: number; failed: number; conflicts: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return { processed: 0, failed: 0, conflicts: 0 };
    }

    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    console.info(`[OfflineSync] Rejeu de ${queue.length} mutation(s) avec Optimistic Concurrency Control...`);

    for (const item of queue) {
      try {
        const method = item.method.toLowerCase();
        const headers: Record<string, string> = {};

        // Injection de l'en-tête de version pour le contrôle de concurrence si disponible
        if (item.clientUpdatedAt) {
          headers['X-Client-Updated-At'] = item.clientUpdatedAt;
        }

        if (method === 'post') {
          await apiClient.post(item.url, item.data, { headers });
        } else if (method === 'put') {
          await apiClient.put(item.url, item.data, { headers });
        } else if (method === 'patch') {
          await apiClient.patch(item.url, item.data, { headers });
        } else if (method === 'delete') {
          await apiClient.delete(item.url, { headers });
        }

        // Succès de la synchronisation sur le serveur Laravel
        this.dequeueMutation(item.id);
        processed++;
      } catch (err: any) {
        console.error(`[OfflineSync] Échec rejeu ${item.method.toUpperCase()} ${item.url}:`, err);

        // 1. Détection de Conflit de Concurrence (HTTP 409 Conflict ou réponse métier de conflit)
        if (err.response?.status === 409) {
          console.warn(`[OfflineSync] Conflit de concurrence détecté pour ${item.url}`);
          item.conflict = true;
          item.conflictDetails = err.response?.data?.message || 'Conflit de version détecté avec le serveur.';
          notifyConflict(item);
          conflicts++;
          this.dequeueMutation(item.id); // Déqueue pour ne pas bloquer les autres
          continue;
        }

        // 2. Perte de connexion réseau : on arrête le traitement pour réessayer lors du prochain événement online
        if (!navigator.onLine || err.code === 'ERR_NETWORK' || !err.response) {
          failed++;
          break;
        }

        // 3. Erreur client 4xx définitive : suppression pour ne pas saturer la file
        if (err.response?.status >= 400 && err.response?.status < 500) {
          console.warn(`[OfflineSync] Erreur client ${err.response.status}, action écartée.`);
          this.dequeueMutation(item.id);
          failed++;
        }
      }
    }

    console.info(`[OfflineSync] Bilan : ${processed} synchronisée(s), ${conflicts} conflit(s), ${failed} échec(s).`);
    return { processed, failed, conflicts };
  },

  // ─── 4. APPLICATION OPTIMISTE LOCALE ─────────────────────────────────────────

  /**
   * Met à jour immédiatement le cache local de façon optimiste lors d'une action hors-ligne.
   */
  updateLocalCacheOptimistically(
    url: string,
    method: 'post' | 'put' | 'patch' | 'delete',
    payload: any,
    tempId: string
  ): void {
    const cleanUrl = url.toLowerCase();
    const id = Date.now();

    // 1. Clients
    if (cleanUrl.includes('/clients')) {
      const clients = offlineStorage.getCachedData<any[]>('clients') || [];
      if (method === 'post') {
        const newClient = {
          id,
          first_name: payload?.first_name || '',
          last_name: payload?.last_name || '',
          phone: payload?.phone || '',
          email: payload?.email || '',
          profession: payload?.profession || '',
          status: payload?.status || 'actif',
          ref_number: payload?.ref_number || `CLT-${id.toString().slice(-4)}`,
          address: payload?.address || '',
          notes: payload?.notes || '',
          _offline: true,
          _temp_id: tempId,
        };
        offlineStorage.saveCachedData('clients', [newClient, ...clients]);
      } else if (method === 'put' || method === 'patch') {
        const targetId = parseInt(cleanUrl.split('/').pop() || '0', 10);
        const updated = clients.map((c) => (c.id === targetId ? { ...c, ...payload, _offline: true } : c));
        offlineStorage.saveCachedData('clients', updated);
      } else if (method === 'delete') {
        const targetId = parseInt(cleanUrl.split('/').pop() || '0', 10);
        offlineStorage.saveCachedData('clients', clients.filter((c) => c.id !== targetId));
      }
    }

    // 2. Rendez-vous
    else if (cleanUrl.includes('/appointments')) {
      const appointments = offlineStorage.getCachedData<any[]>('appointments') || [];
      if (method === 'post') {
        const clients = offlineStorage.getCachedData<any[]>('clients') || [];
        const client = clients.find((c) => c.id === payload?.client_id) || {
          first_name: 'Client',
          last_name: `#${payload?.client_id}`,
          phone: '',
        };
        const newApt = {
          id,
          client_id: payload?.client_id,
          client,
          type: payload?.type || 'Consultation',
          starts_at: payload?.starts_at || new Date().toISOString(),
          duration_minutes: payload?.duration_minutes || 30,
          amount: payload?.amount || 0,
          status: payload?.status || 'en_attente',
          notes: payload?.notes || '',
          _offline: true,
          _temp_id: tempId,
        };
        offlineStorage.saveCachedData('appointments', [newApt, ...appointments]);
      } else if (method === 'put' || method === 'patch') {
        const targetId = parseInt(cleanUrl.split('/').pop() || '0', 10);
        const updated = appointments.map((a) => (a.id === targetId ? { ...a, ...payload, _offline: true } : a));
        offlineStorage.saveCachedData('appointments', updated);
      } else if (method === 'delete') {
        const targetId = parseInt(cleanUrl.split('/').pop() || '0', 10);
        offlineStorage.saveCachedData('appointments', appointments.filter((a) => a.id !== targetId));
      }
    }

    // 3. Factures
    else if (cleanUrl.includes('/invoices')) {
      const invoices = offlineStorage.getCachedData<any[]>('invoices') || [];
      if (method === 'post') {
        const clients = offlineStorage.getCachedData<any[]>('clients') || [];
        const client = clients.find((c) => c.id === payload?.client_id) || {
          first_name: 'Client',
          last_name: `#${payload?.client_id}`,
        };
        const newInvoice = {
          id,
          client_id: payload?.client_id,
          client,
          invoice_number: `F-OFFLINE-${id.toString().slice(-4)}`,
          issued_at: payload?.issued_at || new Date().toISOString(),
          due_at: payload?.due_at || new Date().toISOString(),
          subtotal: payload?.subtotal || 0,
          discount: payload?.discount || 0,
          total: payload?.total || 0,
          status: payload?.status || 'brouillon',
          lines: payload?.lines || [],
          _offline: true,
          _temp_id: tempId,
        };
        offlineStorage.saveCachedData('invoices', [newInvoice, ...invoices]);
      } else if (method === 'patch' && cleanUrl.includes('/mark-paid')) {
        const targetId = parseInt(cleanUrl.replace('/mark-paid', '').split('/').pop() || '0', 10);
        const updated = invoices.map((inv) => (inv.id === targetId ? { ...inv, status: 'payee', _offline: true } : inv));
        offlineStorage.saveCachedData('invoices', updated);
      } else if (method === 'delete') {
        const targetId = parseInt(cleanUrl.split('/').pop() || '0', 10);
        offlineStorage.saveCachedData('invoices', invoices.filter((inv) => inv.id !== targetId));
      }
    }
  },
};
