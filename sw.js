const CACHE = 'releve-smur-v0.5.0-p0-20260716';
const CORE_ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg',
  './assets/plan-urgences-falaise.png', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './src/config.js', './src/main.js',
  './src/application/operational-store.js',
  './src/data/reference.js', './src/data/source-manifest.js', './src/data/operational-assets.js', './src/data/demo-fixtures.js', './src/data/chariot-reference.json',
  './src/domain/ids.js', './src/domain/availability.js', './src/domain/expiry.js', './src/domain/action-engine.js', './src/domain/conflicts.js', './src/domain/priority.js', './src/domain/route-planner.js', './src/domain/statistics.js', './src/domain/validation.js',
  './src/infrastructure/database.js', './src/infrastructure/repository.js', './src/infrastructure/sync-adapter.js',
  './src/ui/utils.js', './src/ui/views.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).origin === self.location.origin) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && new URL(request.url).origin === self.location.origin) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.destination === 'image') event.respondWith(cacheFirst(event.request));
  else event.respondWith(networkFirst(event.request));
});
