/**
 * install.js · "Instalar la app": instala la web en Android, iPhone, iPad u ordenador.
 *
 * Páginas: todas. Usa el botón #installApp del pie (todas las páginas) y, en la portada, la sección
 * #instalar (#installNow, #installStatus y un <details data-os="android|ios|desktop"> por sistema).
 * Depende de: core.js (Radio.$, Radio.url, Radio.track). Necesita manifest.webmanifest y sw.js (sin ellos,
 * Chrome no ofrece instalar). No guarda nada.
 *
 * Cómo funciona en cada sistema:
 *  - Android, Chrome/Edge de ordenador: el navegador lanza `beforeinstallprompt` cuando la web cumple los
 *    requisitos (manifest con iconos, service worker, HTTPS). Se guarda el evento y se muestran los botones;
 *    al pulsarlos, prompt() abre la ventana de instalación del sistema (con las capturas del manifest).
 *  - iPhone/iPad: Apple no tiene ese evento. Los botones llevan a #instalar, donde se abren los pasos
 *    de Safari (Compartir → Añadir a pantalla de inicio).
 *  - Otros (Firefox, Safari de Mac…): sin botón; la portada muestra los pasos del ordenador.
 *  - Si ya se está usando instalada (display-mode: standalone), no se muestra nada y la portada lo dice.
 *
 * Hitos (sin datos personales): instalar/aceptada, instalar/rechazada (ventana del sistema) e
 * instalar/hecha (evento appinstalled, también si se instala desde el menú del navegador).
 *
 * Cómo modificarlo:
 *  - Textos de los pasos: en index.html, sección #instalar.
 *  - Ventana de instalación de Android (nombre, icono, capturas): manifest.webmanifest e img/.
 */
(() => {
  'use strict';
  const { $ } = Radio;
  const footerBtn = $('installApp');
  const nowBtn = $('installNow');
  const status = $('installStatus');
  const box = $('instalar');

  /* ---------- Detección ---------- */
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac: se distingue porque tiene pantalla táctil.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  // navigator.standalone: iPhone/iPad abiertos desde la pantalla de inicio.
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /** Evento beforeinstallprompt guardado para lanzarlo al pulsar (solo Chrome, Edge, Samsung Internet). */
  let deferred = null;

  /**
   * Muestra u oculta los dos botones de instalar.
   * @param {boolean} on
   */
  function buttons(on) {
    [footerBtn, nowBtn].forEach(b => { if (b) b.hidden = !on; });
  }

  /**
   * Escribe el estado en la portada (si existe).
   * @param {string} text
   */
  function say(text) { if (status) status.textContent = text; }

  /* ---------- Estado inicial ---------- */
  // En la portada se abren solo los pasos del sistema que se está usando.
  if (box) box.querySelectorAll('details[data-os]').forEach(d => { d.open = d.dataset.os === platform; });

  if (installed()) {
    buttons(false);
    say('✅ Ya la estás usando instalada. ¡Buen DX!');
    return;
  }
  if (isIOS) {
    // En iPhone/iPad el botón del pie lleva a los pasos; el de la portada no hace falta (los pasos están debajo).
    if (footerBtn) footerBtn.hidden = false;
    say('En iPhone y iPad se instala desde el botón Compartir de Safari: sigue los pasos de abajo.');
  }

  /* ---------- Instalación directa (Android, Chrome y Edge) ---------- */
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // que no salga la barra automática: la ofrecemos con nuestros botones
    deferred = e;
    buttons(true);
    say('Tu navegador permite instalarla con un toque.');
  });

  /**
   * Al pulsar un botón de instalar: abre la ventana del sistema si se puede; si no, lleva a los pasos.
   * @returns {Promise<void>}
   */
  async function install() {
    if (!deferred) { location.href = Radio.url('#instalar'); return; }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null; // cada evento solo se puede usar una vez
    if (outcome === 'accepted') { Radio.track('instalar/aceptada'); buttons(false); say('📲 Instalando… La encontrarás con tus apps.'); }
    else { Radio.track('instalar/rechazada'); }
  }
  [footerBtn, nowBtn].forEach(b => { if (b) b.addEventListener('click', install); });

  // Se dispara al terminar de instalar, también si se hizo desde el menú del navegador.
  addEventListener('appinstalled', () => {
    Radio.track('instalar/hecha');
    buttons(false);
    say('✅ ¡Instalada! Ya la tienes en la pantalla de inicio.');
  });
})();
