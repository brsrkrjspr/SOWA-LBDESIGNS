/* PWA service worker for SOA (offline support).
   Caches core files after first load, then serves them while offline. */

const CACHE_NAME = 'sowa-lbdesigns-v1';

// Keep this list small and focused: app shell + assets needed for PDF export.
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './assets/html2pdf.bundle.min.js',
  './logo/laurenB.png',
  './logo/laub sign.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // If some assets fail to cache (e.g. naming/spaces), app can still work online.
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // For navigation, try cache-first for a seamless offline experience.
  const isNavigation = req.mode === 'navigate';

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Cache navigation + same-origin GETs.
          cache.put(req, copy).catch(() => {});
        });
        return res;
      }).catch(() => {
        if (isNavigation) return caches.match('./index.html');
        return Promise.reject(new Error('Offline and no cached match'));
      });
    })
  );
});

