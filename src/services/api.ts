import axios from 'axios';
import { offlineStorage } from './offlineStorage';

/**
 * Instance Axios pré-configurée pour l'API Laravel Libéralis.
 *
 * Fonctionnalités avancées (Online & Offline) :
 * 1. Intercepteur REQUEST :
 *    - Injecte automatiquement le token Bearer Sanctum.
 *    - Si le mode hors-ligne est forcé par l'utilisateur, simule une coupure réseau locale.
 *
 * 2. Intercepteur RESPONSE :
 *    - En cas de succès d'un GET : met à jour automatiquement le cache local (Clients, RDV, Factures, Stats).
 *    - En cas de 401 : déconnecte et redirige vers /login.
 *    - En cas d'erreur réseau (hors-ligne ou serveur inaccessible) :
 *      * GET : résout avec les données du cache local s'il existe (Read Offline).
 *      * POST / PUT / PATCH / DELETE : empile l'opération dans la file d'attente (Sync Queue),
 *        met à jour le cache de façon optimiste et résout avec un ID temporaire (Write Offline).
 */
const api = axios.create({
  // Utilise /api par défaut pour bénéficier du proxy Vite transparent (compatible PC, Mobile Wi-Fi, USB et Tunnels)
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Intercepteur REQUEST ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Si le praticien a forcé le mode hors-ligne dans Paramètres, on simule une erreur réseau
  const isForcedOffline = localStorage.getItem('liberalis-offline') === 'true';
  if (isForcedOffline && config.url && !config.url.includes('/login')) {
    const error: any = new Error('Mode hors-ligne activé');
    error.code = 'ERR_NETWORK';
    error.config = config;
    return Promise.reject(error);
  }

  return config;
});

// ─── Intercepteur RESPONSE ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // Mise en cache transparente des données lors des requêtes GET réussies
    const url = response.config.url?.toLowerCase() || '';
    const method = response.config.method?.toLowerCase() || '';

    if (method === 'get') {
      if (url.includes('/clients')) {
        const payload = response.data?.data || response.data;
        if (Array.isArray(payload)) {
          offlineStorage.saveCachedData('clients', payload);
        }
      } else if (url.includes('/appointments')) {
        const payload = Array.isArray(response.data) ? response.data : response.data?.data || [];
        offlineStorage.saveCachedData('appointments', payload);
      } else if (url.includes('/invoices')) {
        const payload = response.data?.data || response.data;
        if (Array.isArray(payload)) {
          offlineStorage.saveCachedData('invoices', payload);
        }
      } else if (url.includes('/dashboard/stats')) {
        if (response.data) {
          offlineStorage.saveCachedData('dashboardStats', response.data);
        }
      } else if (url.includes('/notifications')) {
        const payload = response.data?.data || response.data;
        if (Array.isArray(payload)) {
          offlineStorage.saveCachedData('notifications', payload);
        }
      }
    }

    return response;
  },
  (error) => {
    // 1. Redirection en cas d'expiration de session (401)
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 2. Détection de panne réseau ou de mode hors-ligne actif
    const isNetworkError =
      !error.response &&
      (error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error' ||
        error.message === 'Mode hors-ligne activé' ||
        !navigator.onLine ||
        localStorage.getItem('liberalis-offline') === 'true');

    if (isNetworkError && error.config) {
      const method = (error.config.method || 'get').toLowerCase();
      const url = error.config.url || '';

      // Règle de sécurité critique : Les routes d'authentification ne doivent JAMAIS être interceptées
      // ni simulées en mode hors-ligne car elles exigent une validation réelle par le serveur Laravel
      const isAuthRoute = 
        url.includes('/login') || 
        url.includes('/register') || 
        url.includes('/forgot-password') || 
        url.includes('/reset-password');

      if (isAuthRoute) {
        const authError: any = new Error(
          !navigator.onLine
            ? "Connexion impossible : vous êtes hors ligne. Veuillez activer votre connexion Internet."
            : "Impossible de joindre le serveur API. Vérifiez que le serveur backend Laravel est bien démarré."
        );
        authError.response = error.response;
        return Promise.reject(authError);
      }

      // A. Gestion du Read Offline (GET)
      if (method === 'get') {
        let cached: any = null;
        if (url.includes('/clients')) {
          cached = offlineStorage.getCachedData('clients');
        } else if (url.includes('/appointments')) {
          cached = offlineStorage.getCachedData('appointments');
        } else if (url.includes('/invoices')) {
          cached = offlineStorage.getCachedData('invoices');
        } else if (url.includes('/dashboard/stats')) {
          cached = offlineStorage.getCachedData('dashboardStats');
        } else if (url.includes('/notifications')) {
          cached = {
            data: offlineStorage.getCachedData('notifications') || [],
            unread_count: 0,
          };
        }

        if (cached !== null) {
          console.info(`[Axios Offline] Données servies depuis le cache local pour : GET ${url}`);
          return Promise.resolve({
            data: cached,
            status: 200,
            statusText: 'OK (Offline Cache)',
            headers: {},
            config: error.config,
          });
        }
      }

      // B. Gestion du Write Offline (POST / PUT / PATCH / DELETE)
      if (['post', 'put', 'patch', 'delete'].includes(method)) {
        let payload = error.config.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            // Reste une chaîne
          }
        }

        // Enregistre l'opération dans la file d'attente
        const queued = offlineStorage.enqueueMutation({
          url,
          method: method as any,
          data: payload,
        });

        // Applique l'optimisation locale immédiate dans le cache
        offlineStorage.updateLocalCacheOptimistically(url, method as any, payload, queued.id);

        console.info(`[Axios Offline] Mutation mise en attente de synchronisation (${method.toUpperCase()} ${url}) :`, queued.id);

        // Retourne une fausse réponse 200/201 pour ne pas faire crasher l'UI React
        return Promise.resolve({
          data: {
            id: Date.now(),
            _temp_id: queued.id,
            _offline: true,
            ...(payload && typeof payload === 'object' ? payload : {}),
            message: 'Sauvegardé localement. Sera envoyé dès que le réseau est disponible.',
          },
          status: method === 'post' ? 201 : 200,
          statusText: 'OK (Offline Queued)',
          headers: {},
          config: error.config,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
