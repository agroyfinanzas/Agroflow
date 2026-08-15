/**
 * AgroFlow — Service Worker
 * Estrategia: Cache First para assets estáticos + Stale-While-Revalidate para APIs
 * Versión: 2.1.0
 */

const CACHE_NAME      = 'agroflow-v2-1-0';
const DATA_CACHE_NAME = 'agroflow-data-v1';

// ── Assets críticos que se pre-cachean en la instalación (App Shell) ──
const PRECACHE_ASSETS = [
  '/Agroflow/',
  '/Agroflow/index.html',
  '/Agroflow/manifest.json',
  '/Agroflow/icon_transparent.png',
  // CDN — se cachean en runtime la primera vez que se usan
];

// ── CDN externos que se cachean en runtime ────────────────────────────
const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── APIs con datos en vivo (Stale-While-Revalidate) ───────────────────
const LIVE_API_URLS = [
  'dolarapi.com',
];


// ════════════════════════════════════════════════════════════════════════
//  INSTALL — pre-cachear el App Shell
// ════════════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-cacheando App Shell...');
        // addAll falla si algún recurso no existe — usamos add individual
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) =>
              console.warn(`[SW] No se pudo pre-cachear ${url}:`, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] App Shell listo. Activando inmediatamente...');
        return self.skipWaiting(); // Activar sin esperar que se cierren tabs
      })
  );
});


// ════════════════════════════════════════════════════════════════════════
//  ACTIVATE — limpiar cachés viejos
// ════════════════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [CACHE_NAME, DATA_CACHE_NAME];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !CURRENT_CACHES.includes(name))
            .map((oldCache) => {
              console.log('[SW] Eliminando caché obsoleto:', oldCache);
              return caches.delete(oldCache);
            })
        )
      )
      .then(() => {
        console.log('[SW] Activado. Controlando todos los clientes...');
        return self.clients.claim(); // Tomar control inmediato de todos los tabs
      })
  );
});


// ════════════════════════════════════════════════════════════════════════
//  FETCH — estrategias de caché según el tipo de recurso
// ════════════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar GET
  if (request.method !== 'GET') return;

  // ── 1. APIs en vivo → Stale-While-Revalidate ─────────────────────
  //    Devuelve la caché inmediatamente y actualiza en background
  if (LIVE_API_URLS.some((api) => url.hostname.includes(api))) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE_NAME));
    return;
  }

  // ── 2. CDN externos → Cache First con fallback a red ─────────────
  if (CDN_ORIGINS.some((origin) => url.hostname.includes(origin))) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // ── 3. Assets propios (mismo origen) → Cache First ───────────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // ── 4. Todo lo demás → Network con fallback a caché ──────────────
  event.respondWith(networkWithCacheFallback(request));
});


// ════════════════════════════════════════════════════════════════════════
//  ESTRATEGIAS DE CACHÉ
// ════════════════════════════════════════════════════════════════════════

/**
 * Cache First:
 * 1. Busca en caché → si existe, devuelve inmediatamente (offline OK)
 * 2. Si no está, va a la red, guarda en caché y devuelve
 */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  if (cached) {
    // Revalidar en background sin bloquear la respuesta
    fetchAndCache(request, cache).catch(() => {});
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Sin caché y sin red → devolver página offline si existe
    const offlinePage = await cache.match('/Agroflow/index.html');
    if (offlinePage) return offlinePage;
    throw err;
  }
}

/**
 * Stale-While-Revalidate:
 * 1. Devuelve la caché inmediatamente (si existe)
 * 2. Actualiza la caché en background con la respuesta de red
 * Ideal para datos que cambian pero donde la velocidad importa
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Lanzar actualización en paralelo sin await
  const fetchPromise = fetchAndCache(request, cache).catch(() => null);

  // Si hay caché, devolverla ya; sino esperar la red
  return cached || fetchPromise;
}

/**
 * Network First con fallback a caché:
 * Intenta la red primero; si falla usa la caché
 */
async function networkWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Sin conexión y sin caché para este recurso.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/**
 * Helper: fetch y guardar en caché
 */
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}


// ════════════════════════════════════════════════════════════════════════
//  MENSAJE DESDE LA APP → el SW puede recibir comandos
// ════════════════════════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: CACHE_NAME });
  }
});
