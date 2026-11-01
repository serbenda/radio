/**
 * recordings.js · "Grabaciones reales": sonidos de radio grabados en el aire, con licencia libre.
 *
 * Página: Escuchar (#grabaciones). Necesita: #recList (lista <ul>/<ol>). Datos: RECORDINGS (data.js).
 * Depende de: Radio (esc, emit) de core.js. Si RECORDINGS no existe (data.js no cargado), no hace nada.
 *
 * Complementa a sounds.js, cuyos sonidos son sintéticos: aquí se oye cómo suenan de verdad, con ruido,
 * desvanecimientos e interferencias. Los audios se sirven desde Wikimedia Commons (no se copian al
 * repositorio), en Ogg y en la versión MP3 que genera Commons, con preload="none", así que no se descarga nada hasta pulsar ▶.
 * Cada tarjeta muestra autor y licencia con enlace a la página del archivo, como piden CC BY y CC BY-SA.
 * Solo suena una grabación a la vez. Logro: Radio.emit('sound', 'real-' + nombre), cuenta para "Tu primer mes".
 *
 * Servicio externo: Wikimedia Commons (upload.wikimedia.org). No necesita CORS porque se usa <audio>.
 *   El service worker no guarda estos audios (siempre van a la red).
 * Accesibilidad: se usan los controles nativos de <audio> (manejables con teclado) y cada uno lleva
 *   aria-label con el tipo y la descripción de la grabación.
 * No guarda nada en localStorage.
 * Textos: los de la tarjeta van en los dos idiomas con Radio.t; `kind` y `text` ya llegan traducidos desde data.js.
 *
 * Cómo modificarlo:
 *  - Añadir una grabación: nueva entrada en RECORDINGS (data.js); la forma de cada campo está documentada allí.
 *  - Nueva licencia: añade su nombre corto y la URL de su texto en español y en inglés a LIC.
 *  - Cambiar cómo se ve cada tarjeta: la plantilla de `list.innerHTML` (clases .rec, .rec-kind, .rec-credit en el CSS).
 */
(() => {
  'use strict';
  const list = document.getElementById('recList');
  if (!list || typeof RECORDINGS === 'undefined') return;
  const { esc, t } = Radio;
  // Nombre corto de la licencia (campo `license` de RECORDINGS) → página de la licencia en el idioma de la página.
  const LIC = {
    'CC0': t('https://creativecommons.org/publicdomain/zero/1.0/deed.es', 'https://creativecommons.org/publicdomain/zero/1.0/deed.en'),
    'CC BY 4.0': t('https://creativecommons.org/licenses/by/4.0/deed.es', 'https://creativecommons.org/licenses/by/4.0/deed.en'),
    'CC BY-SA 3.0': t('https://creativecommons.org/licenses/by-sa/3.0/deed.es', 'https://creativecommons.org/licenses/by-sa/3.0/deed.en'),
  };
  // Commons publica también una versión MP3 de cada audio (para Safari en iPhone, que no siempre lee Ogg).
  /**
   * URL de la versión MP3 que Commons genera de un .ogg.
   * Patrón de Commons: …/commons/a/ab/X.ogg  →  …/commons/transcoded/a/ab/X.ogg/X.ogg.mp3
   * @param {string} src  URL directa del .ogg.
   * @returns {string} URL del .mp3.
   */
  const mp3 = src => src.replace('/commons/', '/commons/transcoded/') + '/' + src.split('/').pop() + '.mp3';
  /**
   * URL de la página del archivo en Commons (autor, licencia e historial).
   * Commons usa guiones bajos en lugar de espacios en sus URL.
   * @param {string} f  Nombre del archivo con espacios (campo `file`).
   * @returns {string} https://commons.wikimedia.org/wiki/File:…
   */
  const page = f => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_'));

  /* ---------- Tarjetas ---------- */
  // Se pintan todas de una vez al cargar. data-i guarda la posición en RECORDINGS para saber cuál suena.
  // Primero el Ogg; si el navegador no lo puede reproducir, prueba el MP3 (orden de las <source>).
  list.innerHTML = RECORDINGS.map((r, i) => `
    <li class="rec card">
      <p class="rec-kind">${esc(r.kind)} · ${r.secs} s</p>
      <p>${esc(r.text)}</p>
      <audio controls preload="none" data-i="${i}" aria-label="${esc(r.kind)}: ${esc(r.text)}">
        <source src="${esc(r.src)}" type="audio/ogg">
        <source src="${esc(mp3(r.src))}" type="audio/mpeg">
      </audio>
      <p class="rec-credit">${t('Grabación', 'Recording')}: <a href="${page(r.file)}" target="_blank" rel="noopener">${esc(r.author)} ${t('en', 'on')} Wikimedia Commons</a> · <a href="${LIC[r.license] || '#'}" target="_blank" rel="noopener license">${esc(r.license)}</a></p>
    </li>`).join('');

  /* ---------- Reproducción ---------- */
  /**
   * Al empezar a sonar una grabación: pausa las demás y registra el logro 'sound' con id 'real-<archivo>'.
   * Los eventos de <audio> ('play', 'error') no suben por el DOM, así que se escuchan en fase de captura
   * (el `true` del final) para poder tener un único manejador en la lista.
   */
  list.addEventListener('play', e => {
    list.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); });
    const r = RECORDINGS[e.target.dataset.i];
    if (r) Radio.emit('sound', 'real-' + r.file);
  }, true);
  // Si fallan las dos fuentes, el error llega en la última <source>.
  /**
   * Error de carga: el navegador avisa con 'error' en cada <source> que falla. Solo cuando falla la última
   * (no tiene hermana detrás) se sabe que no hay ninguna que funcione, y entonces se añade un aviso
   * bajo el reproductor. También en fase de captura, por lo mismo que 'play'.
   */
  list.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName !== 'SOURCE' || el.nextElementSibling) return;
    el.parentElement.insertAdjacentHTML('afterend', `<p class="note bad">${t('No se ha podido cargar. Prueba desde la página del archivo.', 'It could not be loaded. Try from the file’s page.')}</p>`);
  }, true);
})();
