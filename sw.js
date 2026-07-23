const CACHE_PREFIX = 'releve-smur-';
const CACHE = 'releve-smur-v1.0.0-20260723-etagement-compartiments-v12';
const NETWORK_TIMEOUT_MS = 4000;
const CORE_ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg',
  './assets/plan-urgences-falaise.png', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './assets/branding/releve-logo.jpg', './assets/branding/smur-falaise-vehicle.jpg',
  './assets/sacs/sac-rouge/sac-rouge-face.png', './assets/sacs/sac-rouge/sac-rouge-trois-quarts-gauche.png', './assets/sacs/sac-rouge/sac-rouge-cote-gauche.png', './assets/sacs/sac-rouge/sac-rouge-trois-quarts-droit.png', './assets/sacs/sac-rouge/sac-rouge-cote-droit.png', './assets/sacs/sac-rouge/sac-rouge-dos.png', './assets/sacs/sac-rouge/sac-rouge-dessus.png', './assets/sacs/sac-rouge/sac-rouge-ouvert.png', './assets/sacs/sac-rouge/sac-rouge-amovible.png', './assets/sacs/sac-rouge/sac-rouge-ampoulier.png', './assets/sacs/sac-rouge/sac-rouge-plaque-face-a.png', './assets/sacs/sac-rouge/sac-rouge-plaque-face-b.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-ferme-face.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-inventaire-confirme.json',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-v2-vue-generale-vide.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-v2-vue-generale-compose.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-filet-central-gauche-vide.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-v2-filet-central-gauche-compose.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-filet-central-droit-vide.png',
  './assets/sacs/sac-rouge/ampoulier/ampoulier-v2-filet-central-droit-compose.png',
  './assets/sacs/sac-rouge/ampoulier/items/adrenaline-1mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/adrenaline-5mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/atropine.png',
  './assets/sacs/sac-rouge/ampoulier/items/bicarbonate-sodium.png',
  './assets/sacs/sac-rouge/ampoulier/items/bricanyl.png',
  './assets/sacs/sac-rouge/ampoulier/items/cordarone-150mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/depakine-400mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/digoxine.png',
  './assets/sacs/sac-rouge/ampoulier/items/dispositif-transfert.png',
  './assets/sacs/sac-rouge/ampoulier/items/dobutamine.png',
  './assets/sacs/sac-rouge/ampoulier/items/dopamine-200mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/ephedrine-30mg-10ml.png',
  './assets/sacs/sac-rouge/ampoulier/items/exacyl-acide-tranexamique.png',
  './assets/sacs/sac-rouge/ampoulier/items/flumazenil.png',
  './assets/sacs/sac-rouge/ampoulier/items/furosemide-20mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/g30.png',
  './assets/sacs/sac-rouge/ampoulier/items/gluconate-calcium.png',
  './assets/sacs/sac-rouge/ampoulier/items/isuprel.png',
  './assets/sacs/sac-rouge/ampoulier/items/lidocaine-200mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/loxapac-50mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/loxen-10mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/midazolam-5mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/nacl-50cc.png',
  './assets/sacs/sac-rouge/ampoulier/items/nalbuphine.png',
  './assets/sacs/sac-rouge/ampoulier/items/naloxone.png',
  './assets/sacs/sac-rouge/ampoulier/items/noradrenaline-8mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/pantoprazole-40mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/penthrox.png',
  './assets/sacs/sac-rouge/ampoulier/items/perfuseur-3-voies.png',
  './assets/sacs/sac-rouge/ampoulier/items/perfuseur-volumed.png',
  './assets/sacs/sac-rouge/ampoulier/items/polaramine.png',
  './assets/sacs/sac-rouge/ampoulier/items/primperan.png',
  './assets/sacs/sac-rouge/ampoulier/items/risordan-10mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/salbutamol-fort-5mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/solumedrol-120mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/solumedrol-40mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/tildiem.png',
  './assets/sacs/sac-rouge/ampoulier/items/valium-10mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/xanax-0-5mg.png',
  './assets/sacs/sac-rouge/ampoulier/items/xylocard-1000mg.png',
  './assets/sacs/sac-bleu/sac-bleu-face.png', './assets/sacs/sac-bleu/sac-bleu-cote-gauche.png', './assets/sacs/sac-bleu/sac-bleu-cote-droit.png', './assets/sacs/sac-bleu/sac-bleu-dos.png', './assets/sacs/sac-bleu/sac-bleu-ouvert.png',
  './assets/sacs/sac-vert/sac-vert-face.png', './assets/sacs/sac-vert/sac-vert-cote-gauche.png', './assets/sacs/sac-vert/sac-vert-cote-droit.png', './assets/sacs/sac-vert/sac-vert-dos.png', './assets/sacs/sac-vert/sac-vert-ouvert.png',
  './public/assets/chariots/box-3-4-adulte/chariot-face.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01-intubation-vide-gabarit.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01-intubation-compose.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/sonde-intubation-6-5.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/sonde-intubation-7.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/sonde-intubation-7-5.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/lame-laryngoscope-2.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/lame-laryngoscope-3.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/lame-laryngoscope-4.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/mandrin-intubation.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/mandrin-eschmann.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/canule-oropharyngee-petite.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/canule-oropharyngee-moyenne.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/canule-oropharyngee-grande.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/lacet-fixation.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/pince-magill.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/ventoline.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/leukoplast.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/seringue-omnifix-60ml.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/filtre-respiratoire.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/raccord-cannele.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-01/items/lidocaine-spray-canule.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02-medicaments-vide-gabarit.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02-medicaments-compose.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/adrenaline-1mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/adrenaline-5mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/atropine.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/cordarone-150mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/rivotril.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/valium-10mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/lasilix-20mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/isuprel.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/solumedrol-40mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/solumedrol-120mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/noradrenaline-8mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/sulfate-magnesium.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/midazolam-50mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/g30.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/risordan-10mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/naloxone.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/natispray.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/flumazenil.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/eppi-20ml.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/sufenta-250ug.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/propofol-200mg.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/etomidate.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/aiguille-rose.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/seringue-5ml.png',
  './public/assets/chariots/box-3-4-adulte/tiroir-02/items/seringue-10ml.png',
  './src/config.js', './src/main.js',
  './src/application/operational-store.js',
  './src/data/reference.js', './src/data/source-manifest.js', './src/data/operational-assets.js', './src/data/chariot-adapter.js', './src/data/chariot-reference.json', './src/data/visual-schemas.js', './src/data/sac-visuals.js',
  './src/domain/ids.js', './src/domain/availability.js', './src/domain/expiry.js', './src/domain/action-engine.js', './src/domain/conflicts.js', './src/domain/priority.js', './src/domain/route-planner.js', './src/domain/statistics.js', './src/domain/validation.js',
  './src/infrastructure/database.js', './src/infrastructure/repository.js', './src/infrastructure/sync-adapter.js',
  './src/ui/utils.js', './src/ui/visual-schema.js', './src/ui/dynamic-inventory-viewer.js', './src/ui/views.js',
  './src/features/emergency-ampoule-case/emergency-ampoule-case.css', './src/features/emergency-ampoule-case/web.js',
  './src/features/emergency-carts/emergency-carts.css', './src/features/emergency-carts/emergency-cart-data.js', './src/features/emergency-carts/web.js'
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
