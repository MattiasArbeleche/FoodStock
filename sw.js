// Subí este número cada vez que hagas un deploy nuevo del front.
// Así el navegador sabe que tiene que descartar la caché vieja.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `foodstock-${CACHE_VERSION}`;

const urlsToCache = [
  './testing.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

// 1. Cuando se instala la app, guardamos los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos guardados en caché:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      // Activa esta versión del SW sin esperar a que se cierren las pestañas viejas
      .then(() => self.skipWaiting())
  );
});

// 2. Cuando se activa, borramos cachés de versiones anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombresCache => {
      return Promise.all(
        nombresCache
          .filter(nombre => nombre !== CACHE_NAME)
          .map(nombreViejo => {
            console.log('Borrando caché vieja:', nombreViejo);
            return caches.delete(nombreViejo);
          })
      );
    // Toma control de las pestañas ya abiertas sin esperar a que se recarguen
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptamos las peticiones para que funcione rapidísimo (y sin internet)
self.addEventListener('fetch', event => {
  // Las llamadas a la API nunca se cachean: siempre van a la red directo
  if (event.request.url.includes('pythonanywhere.com')) {
    return;
  }

  // Solo cacheamos GET; POST/PUT/DELETE no tienen sentido cachearlos
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
