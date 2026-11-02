/**
 * sw.js · Service worker: hace la web instalable y usable sin conexión.
 *
 * Qué es: un script que el navegador ejecuta aparte de las páginas y que intercepta todas sus peticiones
 * de red (evento 'fetch'). Lo registra core.js (solo por HTTP/HTTPS, nunca en file://) con alcance
 * (scope) en la raíz del sitio, así que controla las seis páginas. No tiene acceso al DOM ni a `Radio`.
 *
 * Estrategia (docs/ARQUITECTURA.md, decisión D12 en docs/DECISIONES.md):
 *  - Al instalarse guarda las 6 páginas, el CSS, todos los módulos JS y los iconos (PRECACHE).
 *  - Páginas (navegación): primero la red, para ver siempre la última versión; si no hay red,
 *    la copia guardada; si tampoco hay copia, offline.html.
 *  - CSS, JS, tipografías e imágenes propios y librerías de cdnjs: se sirve la copia guardada
 *    al momento y se actualiza en segundo plano (stale-while-revalidate).
 *  - Datos en directo (Radio Browser, HamQTH, CelesTrak, KC2G, teselas, audio, GoatCounter):
 *    NUNCA se guardan; van siempre a la red. Mostrar datos viejos como "en directo" sería mentir.
 *    En la práctica: todo lo que no sea de este sitio ni de un host de STATIC_HOSTS (incluidas Google Fonts,
 *    aunque hoy las tipografías se sirven desde ./fonts/) se deja pasar sin tocar.
 *  - Solo intercepta peticiones GET; las demás (si las hubiera) van directas a la red.
 *
 * Regla de VERSION:
 * Al publicar una versión nueva hay que subir VERSION: así se borran las cachés antiguas.
 * tools/check.mjs comprueba que todo lo de PRECACHE existe y que VERSION coincide con el CHANGELOG.
 *  - Súbela en CADA publicación que cambie cualquier archivo de la web (HTML, CSS, JS, iconos), con el mismo
 *    número que la entrada nueva de CHANGELOG.md. Cambiar este archivo (aunque sea un byte) es lo que hace
 *    que el navegador instale el service worker nuevo; el nombre de la caché nueva ('radio-<VERSION>') hace
 *    que al activarse se borren las anteriores y se descarguen de nuevo todos los archivos de PRECACHE.
 *  - Si no se sube, quien ya visitó la web seguirá viendo los archivos viejos de su caché hasta que la
 *    actualización en segundo plano los renueve (y solo los que vuelva a pedir).
 *
 * Almacenamiento: Cache Storage del navegador (no localStorage). Solo archivos públicos de la web, nunca
 *   datos de la persona (docs/PRIVACIDAD.md). Se borra con los datos del sitio.
 *
 * Cómo modificarlo:
 *  - Archivo nuevo (página, módulo JS, icono, fuente): añádelo a PRECACHE con ruta relativa ("./…") y sube VERSION.
 *    check.mjs falla si una ruta de PRECACHE no existe.
 *  - Librería externa nueva que sí deba funcionar sin conexión: añade su host a STATIC_HOSTS.
 *    Nunca añadas aquí un servicio de datos en directo.
 *  - Cambiar la estrategia de un tipo de petición: el manejador 'fetch' (un bloque por estrategia).
 */
/* ---------- Configuración ---------- */
// Número de versión de la web; tiene que coincidir con la última versión de CHANGELOG.md (lo vigila check.mjs).
// check.mjs la lee con una expresión regular: no cambies la forma de la línea de abajo (nombre, espacios y
// comillas simples) y no escribas esa misma línea de ejemplo en ningún comentario de este archivo, o la leería mal.
const VERSION = '2.6.1';
// Nombre de la caché de esta versión. El prefijo 'radio-' sirve para borrar solo las cachés propias al activarse.
const CACHE = `radio-${VERSION}`;
// Archivos que se descargan y guardan al instalar, para que toda la web funcione sin conexión desde la primera
// visita. Rutas relativas a la ubicación de sw.js (la raíz del sitio). Si una sola falla al descargarse,
// la instalación entera falla (así funciona cache.addAll) y se reintenta en la siguiente visita.
const PRECACHE = [
  './', './escuchar/', './entender/', './espectro/', './practicar/', './examen/', './empezar/', './offline.html',
  './en/', './en/listen/', './en/understand/', './en/spectrum/', './en/practice/', './en/exam/', './en/start/', './js/en/exam-data.js',
  './css/style.css', './manifest.webmanifest',
  './img/icono-192.png', './img/icono-512.png', './img/favicon-64.png',
  './fonts/barlow-condensed-600.woff2', './fonts/barlow-condensed-700.woff2', './fonts/barlow-condensed-800.woff2', './fonts/atkinson-400.woff2', './fonts/atkinson-400-italic.woff2', './fonts/atkinson-700.woff2', './fonts/ibm-plex-mono-400.woff2', './fonts/ibm-plex-mono-600.woff2',
  './js/core.js', './js/data.js', './js/journey.js', './js/glossary.js', './js/backup.js', './js/install.js', './js/classroom.js', './js/beacons.js', './js/sats.js', './js/repeater.js', './js/antenna.js', './js/spectrum.js', './js/antennas.js',
  './js/dial.js', './js/guided.js', './js/bands.js', './js/stations.js', './js/live.js', './js/sounds.js', './js/recordings.js',
  './js/lessons.js', './js/propagation.js', './js/iss.js', './js/morse.js', './js/morse-ui.js', './js/koch.js',
  './js/jargon.js', './js/qso.js', './js/exam-data.js', './js/exam.js', './js/checklist.js',
  './js/clubs-data.js', './js/clubs.js', './js/family.js', './js/faq.js',
];
// Hosts externos con archivos estáticos y versionados (Leaflet, satellite.js) que sí se guardan.
const STATIC_HOSTS = ['cdnjs.cloudflare.com'];

/* ---------- Ciclo de vida ---------- */
/**
 * Instalación: descarga y guarda PRECACHE en la caché de esta versión.
 * skipWaiting(): el service worker nuevo se activa en cuanto termina, sin esperar a que se cierren todas
 * las pestañas abiertas con la versión anterior.
 */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

/**
 * Activación: borra las cachés 'radio-*' de versiones anteriores (todas menos CACHE) y, con clients.claim(),
 * toma el control de las pestañas ya abiertas sin necesidad de recargarlas.
 */
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('radio-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* ---------- Peticiones ---------- */
/**
 * Decide qué hacer con cada petición. Si no se llama a e.respondWith(), el navegador la hace normalmente
 * (es lo que pasa con los datos en directo).
 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // "Propia": mismo origen y dentro de la carpeta de sw.js (la raíz en radio.bendi.dev), para no
  // interferir con otras webs del mismo dominio.
  const own = u.origin === self.location.origin && u.pathname.startsWith(new URL('./', self.location).pathname);

  // Estrategia 1 · Páginas: red primero.
  // Si la red responde bien, se guarda una copia para la próxima vez sin conexión.
  // Si no hay red: la copia guardada (ignoreSearch: la misma página aunque la URL lleve ?parámetros),
  // y si tampoco hay copia, offline.html.
  if (req.mode === 'navigate' && own) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./offline.html')));
    return;
  }

  // Estrategia 2 · Archivos estáticos propios y de STATIC_HOSTS: stale-while-revalidate.
  // Se devuelve la copia guardada al instante (hit) y a la vez se pide a la red para renovarla; la versión
  // nueva se verá en la siguiente carga. Si no hay copia, se espera a la red; si la red falla, se usa la copia.
  // ignoreSearch solo en los propios (un ?v=… no duplica el archivo); en cdnjs la URL completa importa.
  // res.type === 'opaque': respuestas de otro origen sin CORS (no se puede leer su estado, pero sí guardarlas).
  if (own || STATIC_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: own });
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Todo lo demás (datos en directo, audio, métricas) va a la red sin tocar.
  // Estrategia 3 · Solo red: no se llama a respondWith y no se guarda nada.
});
