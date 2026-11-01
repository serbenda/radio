/**
 * guided.js · Escucha guiada en un receptor web real.
 *
 * Página: Escuchar (#guided). Necesita: #guidedTitle, #guidedText, #guidedGo, #guidedWhen, #guidedPresets, #guidedAlt.
 * Datos: LISTEN y WEBSDR (data.js), RECEIVERS (data.js) para los receptores alternativos.
 * Depende de: Radio ($, esc) de core.js.
 *
 * Qué hace:
 *  - Recomienda qué escuchar según la hora (voces en 20 m de día, en 40 m de noche).
 *  - El botón abre el WebSDR de la Universidad de Twente ya sintonizado (?tune=<kHz><modo>).
 *  - Ofrece receptores alternativos por si Twente está saturado o caído.
 *
 * El clic en cualquier enlace a un receptor lo registra journey.js (paso "Abre un receptor real").
 * Servicio externo: WebSDR de Twente, solo como enlace en otra pestaña (es HTTP; al no incrustarse no hay
 *   contenido mixto). Formato y comprobación en docs/DATOS.md.
 * Accesibilidad: los presets son <button> con aria-pressed (el elegido está a "true").
 * No guarda nada en localStorage.
 *
 * Cómo modificarlo:
 *  - Añadir o cambiar un preset: LISTEN en data.js (la forma está documentada allí).
 *  - Cambiar qué se recomienda de día o de noche: el campo `best` en LISTEN; aquí se elige la PRIMERA entrada
 *    con 'day' o 'night'.
 *  - Cambiar el horario de "día": `isDaytime` (de 8:00 a 17:59, hora local).
 *  - Añadir receptores alternativos: RECEIVERS en data.js.
 */
(() => {
  'use strict';
  const { $, esc } = Radio;
  if (!$('guided')) return;

  // Hora local del dispositivo, calculada una vez al cargar la página.
  const hour = new Date().getHours();
  const isDaytime = hour >= 8 && hour < 18;
  const recommended = LISTEN.find(l => l.best === (isDaytime ? 'day' : 'night'));

  /**
   * Muestra un preset: título, texto, enlace al receptor sintonizado y si es la recomendación de la hora.
   * @param {{id:string,title:string,text:string,tune:string}} l  Entrada de LISTEN.
   * Efectos: textos de #guidedTitle, #guidedText y #guidedWhen, href de #guidedGo y aria-pressed de los botones.
   * Los textos van con textContent (no hace falta escapar).
   */
  function show(l) {
    $('guidedTitle').textContent = l.title;
    $('guidedText').textContent = l.text;
    $('guidedGo').href = WEBSDR + l.tune;
    $('guidedWhen').textContent = l === recommended ? `lo mejor a esta hora (${isDaytime ? 'de día' : 'de noche'})` : 'tu elección';
    $('guidedPresets').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === l.id)));
  }
  // Un botón por preset. `chip` es contenido propio de data.js, por eso no se escapa.
  $('guidedPresets').innerHTML = LISTEN.map(l => `<button class="chip" type="button" data-id="${l.id}" aria-pressed="false">${l.chip}</button>`).join('');
  // Un solo manejador para todos los botones (delegación): busca el .chip pulsado y muestra su preset.
  $('guidedPresets').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (b) show(LISTEN.find(l => l.id === b.dataset.id));
  });
  $('guidedAlt').innerHTML = RECEIVERS.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>`).join(' · ');
  show(recommended);
})();
