const CACHE_PREFIX = 'releve-smur-';
const CACHE = 'releve-smur-v1.0.0-20260720-plaque-face-b-v2';
const NETWORK_TIMEOUT_MS = 4000;
const CORE_ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg',
  './assets/plan-urgences-falaise.png', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './assets/sacs/sac-rouge/sac-rouge-face.png', './assets/sacs/sac-rouge/sac-rouge-trois-quarts-gauche.png', './assets/sacs/sac-rouge/sac-rouge-cote-gauche.png', './assets/sacs/sac-rouge/sac-rouge-trois-quarts-droit.png', './assets/sacs/sac-rouge/sac-rouge-cote-droit.png', './assets/sacs/sac-rouge/sac-rouge-dos.png', './assets/sacs/sac-rouge/sac-rouge-dessus.png', './assets/sacs/sac-rouge/sac-rouge-ouvert.png', './assets/sacs/sac-rouge/sac-rouge-amovible.png', './assets/sacs/sac-rouge/sac-rouge-ampoulier.png', './assets/sacs/sac-rouge/sac-rouge-plaque-face-b.png',
  './assets/sacs/sac-bleu/sac-bleu-face.png', './assets/sacs/sac-bleu/sac-bleu-cote-gauche.png', './assets/sacs/sac-bleu/sac-bleu-cote-droit.png', './assets/sacs/sac-bleu/sac-bleu-dos.png', './assets/sacs/sac-bleu/sac-bleu-ouvert.png',
  './assets/sacs/sac-vert/sac-vert-face.png', './assets/sacs/sac-vert/sac-vert-cote-gauche.png', './assets/sacs/sac-vert/sac-vert-cote-droit.png', './assets/sacs/sac-vert/sac-vert-dos.png', './assets/sacs/sac-vert/sac-vert-ouvert.png',
  './src/config.js', './src/main.js',
  './src/application/operational-store.js',
  './src/data/reference.js', './src/data/source-manifest.js', './src/data/operational-assets.js', './src/data/chariot-adapter.js', './src/data/chariot-reference.json', './src/data/visual-schemas.js', './src/data/sac-visuals.js',
  './src/domain/ids.js', './src/domain/availability.js', './src/domain/expiry.js', './src/domain/action-engine.js', './src/domain/conflicts.js', './src/domain/priority.js', './src/domain/route-planner.js', './src/domain/statistics.js', './src/domain/validation.js',
  './src/infrastructure/database.js', './src/infrastructure/repository.js', './src/infrastructure/sync-adapter.js',
  './src/ui/utils.js', './src/ui/visual-schema.js', './src/ui/views.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (!response.body) return response;
    const body = await response.arrayBuffer();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally {
    clearTimeout(timeout);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok && new URL(request.url).origin === self.location.origin) await cache.put(request, response.clone());
    if (!response.ok && cached) return cached;
    if (!response.ok && request.mode === 'navigate') return (await cache.match('./index.html')) || response;
    return response;
  } catch {
    return cached || (request.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetchWithTimeout(request);
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
