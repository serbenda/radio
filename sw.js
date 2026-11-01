/**
 * sw.js · Service worker: hace la web instalable y usable sin conexión.
 *
 * Estrategia (docs/ARQUITECTURA.md, decisión D12 en docs/DECISIONES.md):
 *  - Al instalarse guarda las 6 páginas, el CSS, todos los módulos JS y los iconos (PRECACHE).
 *  - Páginas (navegación): primero la red, para ver siempre la última versión; si no hay red,
 *    la copia guardada; si tampoco hay copia, offline.html.
 *  - CSS, JS, tipografías e imágenes propios y librerías de cdnjs: se sirve la copia guardada
 *    al momento y se actualiza en segundo plano (stale-while-revalidate).
 *  - Datos en directo (Radio Browser, HamQTH, CelesTrak, KC2G, teselas, audio, GoatCounter):
 *    NUNCA se guardan; van siempre a la red. Mostrar datos viejos como "en directo" sería mentir.
 *
 * Al publicar una versión nueva hay que subir VERSION: así se borran las cachés antiguas.
 * tools/check.mjs comprueba que todo lo de PRECACHE existe y que VERSION coincide con el CHANGELOG.
 */
const VERSION = '2.2.0';
const CACHE = `radio-${VERSION}`;
const PRECACHE = [
  './', './escuchar/', './entender/', './practicar/', './examen/', './empezar/', './offline.html',
  './css/style.css', './manifest.webmanifest',
  './img/icono-192.png', './img/icono-512.png', './img/favicon-64.png',
  './fonts/fraunces.woff2', './fonts/ibm-plex-sans.woff2', './fonts/ibm-plex-mono-400.woff2', './fonts/ibm-plex-mono-600.woff2',
  './js/core.js', './js/data.js', './js/journey.js', './js/glossary.js', './js/backup.js',
  './js/dial.js', './js/guided.js', './js/bands.js', './js/stations.js', './js/live.js', './js/sounds.js', './js/recordings.js',
  './js/lessons.js', './js/propagation.js', './js/iss.js', './js/morse.js', './js/morse-ui.js', './js/koch.js',
  './js/jargon.js', './js/qso.js', './js/exam-data.js', './js/exam.js', './js/checklist.js',
  './js/clubs-data.js', './js/clubs.js', './js/family.js', './js/faq.js',
];
const STATIC_HOSTS = ['cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('radio-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const own = u.origin === self.location.origin && u.pathname.startsWith(new URL('./', self.location).pathname);

  if (req.mode === 'navigate' && own) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./offline.html')));
    return;
  }

  if (own || STATIC_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: own });
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Todo lo demás (datos en directo, audio, métricas) va a la red sin tocar.
});
