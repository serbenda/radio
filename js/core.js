/**
 * core.js · Utilidades compartidas por todas las páginas.
 *
 * Se carga el primero en todas las páginas y expone un único objeto global, `Radio`,
 * para que el resto de módulos no repitan código ni ensucien el ámbito global.
 *
 * Qué ofrece:
 *  - Radio.$(id)                 → document.getElementById abreviado.
 *  - Radio.esc(texto)            → escapa HTML; úsalo siempre que pintes texto que venga de fuera.
 *  - Radio.store.get/set(clave)  → localStorage con JSON y try/catch (en modo privado puede fallar).
 *  - Radio.emit(nombre, id)      → avisa de un logro para "Tu primer mes" (evento `radio:event`).
 *  - Radio.url(ruta)             → enlace correcto a otra página, esté donde esté la actual.
 *  - Radio.whileVisible(el, on, off) → ejecuta `on` cuando el elemento se ve y la pestaña está
 *                                   activa, y `off` cuando deja de verse. Es la base para que
 *                                   ninguna animación gaste batería fuera de pantalla.
 *  - Radio.onceVisible(el, cb)   → ejecuta `cb` la primera vez que el elemento se acerca a la vista
 *                                   (carga perezosa de mapas y datos externos).
 *  - Radio.reducedMotion         → true si el sistema pide reducir el movimiento.
 *
 * Además, al cargar:
 *  - Redirige los enlaces antiguos de la web de una sola página (bendi.dev/radio/#ahora → escuchar/#ahora).
 *  - Pone en hora el reloj UTC de la cabecera.
 *  - Marca en el menú la página actual (aria-current="page").
 *  - Activa el botón "Compartir esta web" del pie.
 *
 * Convenciones de toda la web: ver docs/MODULOS.md.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  /** Escapa los caracteres especiales de HTML. */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** localStorage seguro: nunca lanza excepciones (modo privado, cuota llena, cookies bloqueadas). */
  const store = {
    get(key, fallback = null) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* nada */ } },
  };

  /** Avisa de un logro. `journey.js` lo escucha y lo guarda. */
  const emit = (name, id) => document.dispatchEvent(new CustomEvent('radio:event', { detail: { name, id } }));

  /**
   * Raíz del sitio relativa a la página actual. Cada página la declara en
   * <meta name="radio-root" content="../"> (la portada usa "./").
   */
  const root = (document.querySelector('meta[name="radio-root"]') || {}).content || './';
  const url = path => root + path;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Llama a `on()` cuando `el` está en pantalla y la pestaña visible; a `off()` en caso contrario.
   * Devuelve una función para dejar de observar.
   */
  function whileVisible(el, on, off) {
    if (!el) return () => {};
    let inView = false, active = false;
    const sync = () => {
      const should = inView && document.visibilityState === 'visible';
      if (should && !active) { active = true; on(); }
      if (!should && active) { active = false; off(); }
    };
    const io = new IntersectionObserver(es => { inView = es.some(e => e.isIntersecting); sync(); }, { threshold: 0.01 });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); if (active) off(); };
  }

  /** Ejecuta `cb` una sola vez, cuando `el` está a menos de `margin` de la vista. */
  function onceVisible(el, cb, margin = '300px') {
    if (!el) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margin });
    io.observe(el);
  }

  /**
   * Enlace a un formulario de GitHub ya rellenado para avisar de un error.
   * plantilla: 'pregunta-examen' | 'error-contenido' | 'sugerencia'; campos: { idDelCampo: valor }.
   * Los ids de los campos están en .github/ISSUE_TEMPLATE/*.yml. No se envía nada personal.
   */
  const REPO = 'https://github.com/serbenda/radio';
  function report(plantilla, campos = {}, titulo = '') {
    const q = new URLSearchParams({ template: `${plantilla}.yml`, ...campos });
    if (titulo) q.set('title', titulo);
    return `${REPO}/issues/new?${q}`;
  }

  /**
   * Cuenta un hito en GoatCounter como evento "radio/<hito>" (p. ej. radio/qso/primero).
   * Sin datos personales: solo el nombre del hito. Si GoatCounter no ha cargado o está bloqueado, no pasa nada.
   * Lista de hitos: docs/PRIVACIDAD.md.
   */
  function track(hito) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: `radio/${hito}`, title: hito, event: true }); }
    catch (e) { /* sin métricas */ }
  }

  window.Radio = { $, esc, store, emit, url, root, reducedMotion, whileVisible, onceVisible, report, track };

  /* ---------- Enlaces antiguos ---------- */
  // Hasta noviembre de 2026 todo estaba en una sola página: bendi.dev/radio/#ahora, #test…
  // Si alguien llega a la portada con uno de esos anclajes, lo llevamos a su nueva página.
  const MOVED = {
    emisoras: 'escuchar', directo: 'escuchar', ahora: 'escuchar', sonidos: 'escuchar',
    'como-funciona': 'entender', bandas: 'entender', propagacion: 'entender', iss: 'entender',
    morse: 'practicar', jerga: 'practicar', qso: 'practicar',
    test: 'examen',
    empezar: 'empezar', clubes: 'empezar', familias: 'empezar', hispanoamerica: 'empezar', emergencias: 'empezar', faq: 'empezar',
  };
  const old = location.hash.slice(1);
  if (document.body.dataset.page === 'inicio' && MOVED[old]) location.replace(url(`${MOVED[old]}/#${old}`));

  /* ---------- Cabecera y pie, comunes a todas las páginas ---------- */

  // Reloj UTC: los radioaficionados anotan siempre en UTC.
  const clock = $('utc');
  if (clock) {
    const tick = () => { clock.textContent = new Date().toISOString().slice(11, 16); };
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

  // Instalable y sin conexión: registra sw.js (solo por HTTPS o localhost; en file:// no existe).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    addEventListener('load', () => navigator.serviceWorker.register(`${root}sw.js`, { scope: root }).catch(() => { /* sin modo offline */ }));
  }

  // Compartir la web: menú nativo en móvil; en ordenador copia el enlace.
  const share = $('shareSite');
  if (share) {
    const label = share.textContent;
    share.addEventListener('click', async () => {
      const data = { title: 'Radio · Descubre la radioafición', text: 'Escucha emisoras de todo el mundo y haz tu primer contacto por radio 📻', url: 'https://bendi.dev/radio/' };
      if (navigator.share) { try { await navigator.share(data); } catch (e) { /* cancelado */ } return; }
      try { await navigator.clipboard.writeText(data.url); share.textContent = '✅ Enlace copiado'; } catch (e) { share.textContent = data.url; }
      setTimeout(() => { share.textContent = label; }, 2500);
    });
  }
})();
