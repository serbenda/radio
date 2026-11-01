/**
 * core.js · Utilidades compartidas por todas las páginas (el "núcleo" de la web).
 *
 * Páginas: TODAS. Se carga el PRIMERO de los scripts propios (después solo de librerías externas como
 * Leaflet), porque el resto de módulos usan el objeto global `Radio` que crea este archivo.
 *
 * Elementos que usa (todos opcionales; si no están, esa parte no se activa):
 *  - <meta name="radio-root" content="../">  raíz del sitio relativa a la página ("./" en la portada).
 *  - <body data-page="inicio|escuchar|…">    página actual (menú activo y redirección de enlaces antiguos).
 *  - #utc          reloj UTC de la cabecera.
 *  - .top nav a[data-page]  enlaces del menú.
 *  - #reportLink   enlace "¿Ves un error?" del pie.
 *  - #shareSite    botón "Compartir esta web" del pie.
 *
 * Qué ofrece (window.Radio):
 *  - Radio.$(id)                 → document.getElementById abreviado.
 *  - Radio.esc(texto)            → escapa HTML; úsalo siempre que pintes texto que venga de fuera.
 *  - Radio.store.get/set/remove  → localStorage con JSON y try/catch (en modo privado puede fallar).
 *  - Radio.emit(nombre, id)      → avisa de un logro para "Tu primer mes" (evento `radio:event`).
 *  - Radio.url(ruta)             → enlace correcto a otra página, esté donde esté la actual y en su idioma
 *                                   (la ruta se escribe con nombres en castellano: url('examen/')).
 *  - Radio.root                  → la raíz relativa ("./", "../" o "../../").
 *  - Radio.lang / Radio.locale   → 'es' o 'en' / 'es-ES' o 'en-GB' (según <html lang>).
 *  - Radio.t(es, en)             → el texto del idioma de la página: t('Cargando…', 'Loading…').
 *  - Radio.counterpart(idioma)   → la misma página en el otro idioma (selector ES/EN de la cabecera).
 *  - Radio.whileVisible(el, on, off) → ejecuta `on` cuando el elemento se ve y la pestaña está
 *                                   activa, y `off` cuando deja de verse. Es la base para que
 *                                   ninguna animación gaste batería fuera de pantalla.
 *  - Radio.onceVisible(el, cb)   → ejecuta `cb` la primera vez que el elemento se acerca a la vista
 *                                   (carga perezosa de mapas y datos externos).
 *  - Radio.reducedMotion         → true si el sistema pide reducir el movimiento.
 *  - Radio.report(plantilla, campos, título) → URL de un formulario de GitHub ya rellenado.
 *  - Radio.track(hito)           → cuenta un hito en GoatCounter (nombre fijo, sin datos personales).
 *
 * Además, al cargar:
 *  - Redirige los enlaces antiguos de la web de una sola página (bendi.dev/radio/#ahora → escuchar/#ahora).
 *  - Pone en hora el reloj UTC de la cabecera.
 *  - Marca en el menú la página actual (aria-current="page").
 *  - Rellena el enlace "¿Ves un error?" con la página actual.
 *  - Registra el service worker (sw.js) para el modo sin conexión.
 *  - Activa el botón "Compartir esta web" del pie.
 *
 * Eventos: emite `radio:event` (vía Radio.emit). No escucha ninguno propio.
 * Almacenamiento: no guarda nada por sí mismo; Radio.store es el envoltorio que usan los demás (claves "radio.*").
 * Servicios externos: GoatCounter (solo si ya ha cargado su script; si está bloqueado no pasa nada) y
 *   GitHub (solo se construye un enlace; no se envía nada hasta que la persona publica la incidencia).
 *
 * Cómo modificarlo:
 *  - Nueva utilidad común: escríbela dentro de la función autoejecutable, añádela al objeto de
 *    `window.Radio = { … }` y documéntala en esta cabecera y en docs/ARQUITECTURA.md.
 *  - Nueva página o sección movida: actualiza la tabla MOVED (sección antigua → carpeta nueva).
 *  - Cambiar el texto o la URL al compartir: objeto `data` dentro del bloque "Compartir la web".
 *  - Nueva plantilla de aviso de error: crea el .yml en .github/ISSUE_TEMPLATE/ y llama a Radio.report con su nombre.
 *
 * Convenciones de toda la web: ver docs/MODULOS.md.
 */
(() => {
  'use strict';

  /* ---------- Utilidades básicas ---------- */

  /**
   * Atajo de document.getElementById.
   * @param {string} id  Id del elemento, sin "#".
   * @returns {HTMLElement|null} El elemento, o null si no está en la página.
   */
  const $ = id => document.getElementById(id);

  /**
   * Escapa los caracteres especiales de HTML (& < > " ') para poder meter texto en innerHTML sin riesgo.
   * Úsalo con todo lo que venga de fuera: APIs, archivos o lo que escribe la persona.
   * @param {*} s  Texto (o cualquier valor; null y undefined se convierten en cadena vacía).
   * @returns {string} Texto seguro para HTML, también dentro de atributos entre comillas.
   */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /**
   * localStorage seguro: nunca lanza excepciones (modo privado, cuota llena, cookies bloqueadas).
   * Los valores se guardan como JSON, así que se pueden guardar objetos y listas directamente.
   * Por convención todas las claves empiezan por "radio." (backup.js copia solo esas).
   */
  const store = {
    /**
     * Lee y descodifica una clave.
     * @param {string} key  Clave, p. ej. "radio.exam".
     * @param {*} [fallback=null]  Valor que se devuelve si la clave no existe, está vacía, no es JSON
     *   válido o el almacenamiento no está disponible.
     * @returns {*} El valor guardado o `fallback`.
     */
    get(key, fallback = null) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
    },
    /**
     * Guarda un valor como JSON.
     * @param {string} key  Clave "radio.*".
     * @param {*} value  Cualquier valor serializable con JSON.stringify.
     * @returns {boolean} true si se ha guardado; false si el navegador no lo permite (modo privado, cuota llena).
     */
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    /**
     * Borra una clave. Si el almacenamiento no está disponible, no hace nada.
     * @param {string} key  Clave a borrar.
     */
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* nada */ } },
  };

  /**
   * Avisa de un logro de "Tu primer mes". journey.js lo escucha, lo guarda y repinta la ruta.
   * Llámalo solo cuando la persona HACE algo (pulsar, escuchar…), nunca al cargar (decisión D08).
   * @param {string} name  Tipo de logro: 'station', 'websdr', 'sound', 'prop', 'live', 'iss'…
   * @param {string} [id]  Qué en concreto (emisora, sonido…). journey.js cuenta ids distintos, así que
   *   repetir el mismo id no suma; sin id, cada llamada cuenta como uno nuevo.
   * @returns {boolean} El valor de dispatchEvent (no se usa).
   * Efecto: dispara en `document` el evento CustomEvent 'radio:event' con detail { name, id }.
   */
  const emit = (name, id) => document.dispatchEvent(new CustomEvent('radio:event', { detail: { name, id } }));

  /* ---------- Rutas entre páginas ---------- */

  /**
   * Raíz del sitio relativa a la página actual. Cada página la declara en
   * <meta name="radio-root" content="../"> (la portada usa "./").
   * Así los enlaces funcionan igual en bendi.dev/radio/, en local y abriendo el archivo directamente.
   */
  const root = (document.querySelector('meta[name="radio-root"]') || {}).content || './';

  /* ---------- Idioma (castellano / inglés) ----------
   * La web existe en castellano (raíz) y en inglés (carpeta en/, con nombres de carpeta en inglés).
   * Las dos versiones comparten módulos, ids y datos guardados; cambia solo el texto.
   * Detalle: docs/IDIOMAS.md. */

  /** Idioma de la página: 'en' si <html lang="en…">; si no, 'es'. */
  const lang = /^en/i.test(document.documentElement.lang) ? 'en' : 'es';
  /** Configuración regional para fechas, horas y números (toLocaleString…). */
  const locale = lang === 'en' ? 'en-GB' : 'es-ES';

  /**
   * Elige el texto del idioma de la página. Los módulos escriben los dos textos juntos:
   *   t('Cargando emisoras…', 'Loading stations…')
   * @param {*} es  Texto (o valor) en castellano.
   * @param {*} [en] El mismo en inglés. Si falta, se usa el castellano.
   * @returns {*} El del idioma actual.
   */
  const t = (es, en) => (lang === 'en' && en !== undefined ? en : es);

  /** Nombre de cada página en castellano (carpeta de la raíz) → carpeta en la versión inglesa (en/…). */
  const SLUGS = { escuchar: 'listen', entender: 'understand', practicar: 'practice', examen: 'exam', empezar: 'start' };
  const SLUGS_ES = Object.fromEntries(Object.entries(SLUGS).map(([es, en]) => [en, es]));

  /**
   * Construye un enlace a otra página del sitio desde la página actual, en el idioma actual.
   * Las rutas se escriben SIEMPRE con los nombres en castellano; en inglés se traducen solas:
   *   url('escuchar/#emisoras') → '../escuchar/#emisoras' (castellano) o '../../en/listen/#emisoras' (inglés).
   * @param {string} path  Ruta desde la raíz del sitio, sin "/" inicial (p. ej. 'escuchar/#emisoras', '#mes', '').
   * @returns {string} Ruta relativa lista para usar en href.
   */
  const url = path => {
    if (lang !== 'en') return root + path;
    const m = path.match(/^([a-z-]+)\/(.*)$/);
    return root + 'en/' + (m && SLUGS[m[1]] ? `${SLUGS[m[1]]}/${m[2]}` : path);
  };

  /**
   * Dirección de la misma página en el otro idioma (para el selector de idioma).
   * @param {'es'|'en'} to Idioma de destino.
   * @returns {string} Ruta relativa con el mismo anclaje (#…).
   */
  function counterpart(to) {
    const page = document.body.dataset.page;      // siempre el nombre en castellano: inicio, escuchar…
    const folder = page === 'inicio' ? '' : `${to === 'en' ? SLUGS[page] : page}/`;
    return root + (to === 'en' ? 'en/' : '') + folder + location.hash;
  }

  // Se lee una sola vez al cargar: si la persona cambia el ajuste del sistema, se aplica al recargar.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Visibilidad: animaciones y carga perezosa ---------- */

  /**
   * Llama a `on()` cuando `el` está en pantalla y la pestaña visible; a `off()` en caso contrario.
   * Garantiza que `on` y `off` se alternan (nunca dos `on` seguidos), así que se pueden usar para
   * arrancar y parar un temporizador o un requestAnimationFrame sin duplicarlos.
   * @param {Element|null} el  Elemento que se vigila. Si es null, no hace nada.
   * @param {Function} on   Se llama al empezar a verse (y la pestaña está activa).
   * @param {Function} off  Se llama al dejar de verse o al ocultarse la pestaña.
   * @returns {Function} Función para dejar de observar (llama a `off` si estaba activo).
   */
  function whileVisible(el, on, off) {
    if (!el) return () => {};
    // inView: el elemento está en el viewport; active: ya se ha llamado a on() y no a off().
    let inView = false, active = false;
    /** Compara el estado deseado con el actual y llama a on/off solo cuando cambia. */
    const sync = () => {
      const should = inView && document.visibilityState === 'visible';
      if (should && !active) { active = true; on(); }
      if (!should && active) { active = false; off(); }
    };
    // threshold 0.01: basta con que asome un 1 % del elemento para considerarlo visible.
    const io = new IntersectionObserver(es => { inView = es.some(e => e.isIntersecting); sync(); }, { threshold: 0.01 });
    io.observe(el);
    // Cambiar de pestaña o minimizar no cambia la intersección; por eso se vigila también visibilitychange.
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); if (active) off(); };
  }

  /**
   * Ejecuta `cb` una sola vez, cuando `el` está a menos de `margin` de la vista.
   * Sirve para cargar mapas y datos externos solo si la persona llega a esa sección.
   * @param {Element|null} el  Elemento que se vigila. Si es null, no hace nada.
   * @param {Function} cb  Se llama una única vez.
   * @param {string} [margin='300px']  Margen CSS (rootMargin): cuánto antes de entrar en pantalla se dispara,
   *   para que el contenido esté listo cuando llegue.
   */
  function onceVisible(el, cb, margin = '300px') {
    if (!el) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margin });
    io.observe(el);
  }

  /* ---------- Avisos de errores y métricas ---------- */

  /**
   * Enlace a un formulario de GitHub ya rellenado para avisar de un error.
   * plantilla: 'pregunta-examen' | 'error-contenido' | 'sugerencia'; campos: { idDelCampo: valor }.
   * Los ids de los campos están en .github/ISSUE_TEMPLATE/*.yml. No se envía nada personal.
   */
  const REPO = 'https://github.com/serbenda/radio';
  /**
   * Construye la URL del formulario de incidencia de GitHub (decisión D14).
   * @param {string} plantilla  Nombre del archivo .yml sin extensión ('pregunta-examen', 'error-contenido', 'sugerencia').
   * @param {Object<string,string>} [campos={}]  Valores iniciales: clave = id del campo en el .yml.
   * @param {string} [titulo='']  Título propuesto para la incidencia.
   * @returns {string} URL https://github.com/serbenda/radio/issues/new?template=…  No hace ninguna petición.
   */
  function report(plantilla, campos = {}, titulo = '') {
    const q = new URLSearchParams({ template: `${plantilla}.yml`, ...campos });
    if (titulo) q.set('title', titulo);
    return `${REPO}/issues/new?${q}`;
  }

  /**
   * Cuenta un hito en GoatCounter como evento "radio/<hito>" (p. ej. radio/qso/primero).
   * Sin datos personales: solo el nombre del hito. Si GoatCounter no ha cargado o está bloqueado, no pasa nada.
   * Lista de hitos: docs/PRIVACIDAD.md.
   * @param {string} hito  Nombre FIJO del hito (p. ej. 'progreso/guardar'). Nunca metas texto que escriba
   *   la persona: tools/check.mjs falla si el argumento no es un nombre fijo (decisión D13).
   * Efecto: una petición a GoatCounter (la hace su propio script, cargado con async al final de la página).
   */
  function track(hito) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: `radio/${hito}`, title: hito, event: true }); }
    catch (e) { /* sin métricas */ }
  }

  // Única variable global que crea este archivo. Los demás módulos hacen `const { $, esc, store } = Radio;`.
  window.Radio = { $, esc, store, emit, url, root, lang, locale, t, counterpart, SLUGS, SLUGS_ES, reducedMotion, whileVisible, onceVisible, report, track };

  /* ---------- Enlaces antiguos ---------- */
  // Hasta noviembre de 2026 todo estaba en una sola página: bendi.dev/radio/#ahora, #test…
  // Si alguien llega a la portada con uno de esos anclajes, lo llevamos a su nueva página.
  // Formato: idDeSección: 'carpeta de la página donde vive ahora'.
  const MOVED = {
    emisoras: 'escuchar', directo: 'escuchar', ahora: 'escuchar', sonidos: 'escuchar',
    'como-funciona': 'entender', bandas: 'entender', propagacion: 'entender', iss: 'entender',
    morse: 'practicar', jerga: 'practicar', qso: 'practicar',
    test: 'examen',
    empezar: 'empezar', clubes: 'empezar', familias: 'empezar', hispanoamerica: 'empezar', emergencias: 'empezar', faq: 'empezar',
  };
  const old = location.hash.slice(1);
  // location.replace (y no location.href) para que el botón "Atrás" no vuelva a la URL antigua y repita la redirección.
  if (lang === 'es' && document.body.dataset.page === 'inicio' && MOVED[old]) location.replace(url(`${MOVED[old]}/#${old}`));

  /* ---------- Cabecera y pie, comunes a todas las páginas ---------- */

  // Reloj UTC: los radioaficionados anotan siempre en UTC.
  const clock = $('utc');
  if (clock) {
    /** Escribe la hora UTC actual en formato HH:MM (caracteres 11 a 15 de la fecha ISO). */
    const tick = () => { clock.textContent = new Date().toISOString().slice(11, 16); };
    // Cada 10 s (10000 ms): solo se muestran minutos, así el retraso máximo es de 10 s sin gastar de más.
    tick(); setInterval(tick, 10000);
  }

  // Página actual en el menú (para lectores de pantalla y estilo).
  const page = document.body.dataset.page;
  document.querySelectorAll('.top nav a[data-page]').forEach(a => {
    if (a.dataset.page === page) a.setAttribute('aria-current', 'page');
  });

  // "¿Ves un error?": abre el formulario de GitHub con la página ya puesta.
  const rep = $('reportLink');
  if (rep) rep.href = report('error-contenido', { pagina: location.origin + location.pathname + location.hash }, `[Web] ${document.title}`);

  // Selector de idioma de la cabecera: lleva a la misma página (y la misma sección) en el otro idioma.
  // El href ya viene escrito en el HTML; aquí se le añade el #anclaje actual y se recuerda la elección.
  const sw = $('langSwitch');
  if (sw) sw.addEventListener('click', () => {
    sw.href = counterpart(sw.hreflang === 'en' ? 'en' : 'es');
    store.set('radio.lang', sw.hreflang);
  });

  // "Apoya el proyecto": cuenta cuántas personas abren la página de GitHub Sponsors (hito sin datos personales).
  const sponsor = $('sponsorLink');
  if (sponsor) sponsor.addEventListener('click', () => track('apoyo/sponsors'));
  const sponsorMain = $('sponsorMain');
  if (sponsorMain) sponsorMain.addEventListener('click', () => track('apoyo/sponsors-portada'));

  // Instalable y sin conexión: registra sw.js (solo por HTTPS o localhost; en file:// no existe).
  // Se espera al evento load para no competir con la carga de la página. El scope es la raíz del sitio,
  // de modo que el service worker controla las seis páginas.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register(`${root}sw.js`, { scope: root }).catch(() => { /* sin modo offline */ }));
  }

  // Compartir la web: menú nativo en móvil; en ordenador copia el enlace.
  const share = $('shareSite');
  if (share) {
    const label = share.textContent;
    /**
     * Clic en "Compartir esta web".
     * Si el navegador tiene navigator.share (móviles), abre el menú nativo; si no, copia la URL al
     * portapapeles y cambia el texto del botón durante 2,5 s. Si tampoco hay portapapeles, muestra la URL.
     */
    share.addEventListener('click', async () => {
      const data = { title: t('Radio · Descubre la radioafición', 'Radio · Discover amateur radio'), text: t('Escucha emisoras de todo el mundo y haz tu primer contacto por radio 📻', 'Listen to stations from all over the world and make your first radio contact 📻'), url: t('https://bendi.dev/radio/', 'https://bendi.dev/radio/en/') };
      if (navigator.share) { try { await navigator.share(data); } catch (e) { /* cancelado */ } return; }
      try { await navigator.clipboard.writeText(data.url); share.textContent = t('✅ Enlace copiado', '✅ Link copied'); } catch (e) { share.textContent = data.url; }
      setTimeout(() => { share.textContent = label; }, 2500);
    });
  }
})();
