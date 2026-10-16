const CACHE_VERSION = 'v3-ios';
const CACHE_NAME = `foodstock-${CACHE_VERSION}`;

const urlsToCache = [
  './testing.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombresCache => {
      return Promise.all(
        nombresCache
          .filter(nombre => nombre !== CACHE_NAME)
          .map(nombreViejo => caches.delete(nombreViejo))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('pythonanywhere.com') || event.request.method !== 'GET') {
    return;
  }

  // Estrategia Network-First con Fallback a Caché para que siempre veas la última versión
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});