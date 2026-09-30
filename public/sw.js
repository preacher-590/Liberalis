/**
 * Service Worker — Libéralis PWA (Offline Support)
 *
 * Fonctionnalités :
 * 1. Mise en cache de l'App Shell (index.html, manifest, icônes)
 * 2. Stratégie Network-First avec fallback index.html pour les navigations SPA (rechargement F5 hors-ligne)
 * 3. Stratégie Stale-While-Revalidate pour les assets statiques compilés (JS, CSS, SVG)
 * 4. Les requêtes API (/api/*) sont laissées à Axios qui dispose de son propre cache offlineStorage.
 */

const CACHE_NAME = 'liberalis-shell-v1';

// Assets essentiels pré-chargés lors de l'installation du Service Worker
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
];

// ─── INSTALLATION DU SERVICE WORKER ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.info('[ServiceWorker] Mise en cache de l\'App Shell...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVATION ET NETTOYAGE DES ANCIENS CACHES ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.info(`[ServiceWorker] Suppression de l'ancien cache : ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ─── INTERCEPTION DES REQUÊTES (FETCH) ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Les requêtes API sont déléguées directement au réseau (gérées côté frontend par Axios + offlineStorage)
  if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) {
    return;
  }

  // 2. Gestion de la navigation SPA (Mode Navigate)
  // Permet de recharger n'importe quelle page (/agenda, /clients, /factures) hors-ligne sans erreur 404
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html').then((cached) => {
          return cached || fetch(request);
        });
      })
    );
    return;
  }

  // 3. Gestion des assets statiques (CSS, JS, images, polices)
  // Stratégie Stale-While-Revalidate : sert le cache instantanément et met à jour en arrière-plan
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Par défaut : Réseau avec fallback vers le cache
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});
