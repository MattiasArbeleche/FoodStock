const CACHE_NAME = 'foodstock-v1';
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
        console.log('Archivos guardados en caché');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Interceptamos las peticiones para que funcione rapidísimo (y sin internet)
self.addEventListener('fetch', event => {
  if (event.request.url.includes('pythonanywhere.com')) {
    return; // Deja que el navegador haga la petición normalmente
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo está en la caché, lo devuelve directo. Si no, lo pide a internet.
        return response || fetch(event.request);
      })
  );
});
