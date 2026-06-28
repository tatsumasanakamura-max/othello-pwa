const CACHE_NAME = 'othello-pwa-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './ai.js',
  './ai/weights.js',
  './ai/transposition.js',
  './ai/openingBook.js',
  './ai/evaluation.js',
  './ai/minimax.js',
  './ai/search.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './README.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)),
          );
          return response;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});
