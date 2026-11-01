/**
 * recordings.js · "Grabaciones reales": sonidos de radio grabados en el aire, con licencia libre.
 *
 * Página: Escuchar (#grabaciones). Necesita: #recList. Datos: RECORDINGS (data.js).
 *
 * Complementa a sounds.js, cuyos sonidos son sintéticos: aquí se oye cómo suenan de verdad, con ruido,
 * desvanecimientos e interferencias. Los audios se sirven desde Wikimedia Commons (no se copian al
 * repositorio), en Ogg y en la versión MP3 que genera Commons, con preload="none", así que no se descarga nada hasta pulsar ▶.
 * Cada tarjeta muestra autor y licencia con enlace a la página del archivo, como piden CC BY y CC BY-SA.
 * Solo suena una grabación a la vez. Logro: Radio.emit('sound', 'real-' + nombre), cuenta para "Tu primer mes".
 */
(() => {
  'use strict';
  const list = document.getElementById('recList');
  if (!list || typeof RECORDINGS === 'undefined') return;
  const { esc } = Radio;
  const LIC = {
    'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/deed.es',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/deed.es',
    'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
  };
  // Commons publica también una versión MP3 de cada audio (para Safari en iPhone, que no siempre lee Ogg).
  const mp3 = src => src.replace('/commons/', '/commons/transcoded/') + '/' + src.split('/').pop() + '.mp3';
  const page = f => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(f.replace(/ /g, '_'));

  list.innerHTML = RECORDINGS.map((r, i) => `
    <li class="rec card">
      <p class="rec-kind">${esc(r.kind)} · ${r.secs} s</p>
      <p>${esc(r.text)}</p>
      <audio controls preload="none" data-i="${i}" aria-label="${esc(r.kind)}: ${esc(r.text)}">
        <source src="${esc(r.src)}" type="audio/ogg">
        <source src="${esc(mp3(r.src))}" type="audio/mpeg">
      </audio>
      <p class="rec-credit">Grabación: <a href="${page(r.file)}" target="_blank" rel="noopener">${esc(r.author)} en Wikimedia Commons</a> · <a href="${LIC[r.license] || '#'}" target="_blank" rel="noopener license">${esc(r.license)}</a></p>
    </li>`).join('');

  list.addEventListener('play', e => {
    list.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); });
    const r = RECORDINGS[e.target.dataset.i];
    if (r) Radio.emit('sound', 'real-' + r.file);
  }, true);
  // Si fallan las dos fuentes, el error llega en la última <source>.
  list.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName !== 'SOURCE' || el.nextElementSibling) return;
    el.parentElement.insertAdjacentHTML('afterend', '<p class="note bad">No se ha podido cargar. Prueba desde la página del archivo.</p>');
  }, true);
})();
