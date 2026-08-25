// ═══════════════════════════════════════════════════════════
//  AgroFlow — Service Worker  (Offline-First)
//  Versión: incrementar CACHE_NAME para forzar actualización
// ═══════════════════════════════════════════════════════════
const CACHE_NAME = 'agroflow-v1';

// Archivos a cachear en la instalación
const PRECACHE_URLS = [
  '/Agroflow/',
  '/Agroflow/index.html',
  '/Agroflow/codigo-integracion-agroflow.js',
  '/Agroflow/planificador-siembra-insumos-integrado.html',
  // Fuentes y librerías externas (opcional — ya tienen cache HTTP propio)
];

// ── INSTALL: pre-cachear assets estáticos
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Error pre-cacheando:', err);
      })
    )
  );
});

// ── ACTIVATE: limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia Network-First con fallback a cache
self.addEventListener('fetch', event => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Dejar pasar requests a APIs externas (Firebase, Google, cotizaciones)
  const passThrough = [
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'accounts.google.com',
    'gstatic.com',
    'googleapis.com',
    'dolarapi.com',
    'ambito.com',
  ];
  if (passThrough.some(d => url.hostname.includes(d))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuesta exitosa de recursos propios
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Sin red: servir desde cache
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback final: devolver index.html para rutas de la app
          if (event.request.mode === 'navigate') {
            return caches.match('/Agroflow/index.html');
          }
          return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

// ── SYNC: Background Sync (cuando vuelve la conexión)
self.addEventListener('sync', event => {
  if (event.tag === 'mon-sync') {
    // El cliente maneja la sync real; aquí solo notificamos
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SYNC_NOW' }));
    });
  }
});
