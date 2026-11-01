/**
 * guided.js · Escucha guiada en un receptor web real.
 *
 * Página: Escuchar (#guided). Necesita: #guidedTitle, #guidedText, #guidedGo, #guidedWhen, #guidedPresets, #guidedAlt.
 * Datos: LISTEN y WEBSDR (data.js), RECEIVERS (data.js) para los receptores alternativos.
 *
 * Qué hace:
 *  - Recomienda qué escuchar según la hora (voces en 20 m de día, en 40 m de noche).
 *  - El botón abre el WebSDR de la Universidad de Twente ya sintonizado (?tune=<kHz><modo>).
 *  - Ofrece receptores alternativos por si Twente está saturado o caído.
 *
 * El clic en cualquier enlace a un receptor lo registra journey.js (paso "Abre un receptor real").
 */
(() => {
  'use strict';
  const { $, esc } = Radio;
  if (!$('guided')) return;

  const hour = new Date().getHours();
  const isDaytime = hour >= 8 && hour < 18;
  const recommended = LISTEN.find(l => l.best === (isDaytime ? 'day' : 'night'));

  function show(l) {
    $('guidedTitle').textContent = l.title;
    $('guidedText').textContent = l.text;
    $('guidedGo').href = WEBSDR + l.tune;
    $('guidedWhen').textContent = l === recommended ? `lo mejor a esta hora (${isDaytime ? 'de día' : 'de noche'})` : 'tu elección';
    $('guidedPresets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === l.id)));
  }
  $('guidedPresets').innerHTML = LISTEN.map(l => `<button class="chip" type="button" data-id="${l.id}" aria-pressed="false">${l.chip}</button>`).join('');
  $('guidedPresets').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (b) show(LISTEN.find(l => l.id === b.dataset.id));
  });
  $('guidedAlt').innerHTML = RECEIVERS.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>`).join(' · ');
  show(recommended);
})();
