/**
 * checklist.js · Lista de comprobación "de cero a indicativo" (los pasos para ser radioaficionado).
 *
 * Página: empezar/index.html.
 * Elementos necesarios:
 *   #checklist   lista con casillas <input type="checkbox" data-k="clave">; el texto de cada paso está
 *                en el HTML, este módulo solo recuerda cuáles están marcadas.
 *   #checkNote   párrafo donde se escribe "n de N pasos hechos" (o la felicitación al completar todos).
 * Si #checklist no existe, el módulo no hace nada.
 *
 * Dependencias: Radio (js/core.js): Radio.$ y Radio.store (localStorage con JSON y try/catch).
 *
 * Qué guarda: localStorage, clave "radio.checklist" → { "<data-k>": true | false, … }
 *   Ejemplo: { "escuchar": true, "club": false }. Solo aparecen las casillas que se han tocado alguna vez.
 *   Claves actuales en el HTML: escuchar, club, estudio, solicitud, aprobado, autorizacion, seguro, estacion, qso.
 *   journey.js lee la clave "club" para el paso "Contacta con un radioclub"; backup.js la copia con el resto.
 *
 * Textos visibles: en castellano e inglés con Radio.t(es, en) (los pasos están en el HTML de cada idioma).
 *
 * Eventos: emite `radio:progress` en document cada vez que cambia una casilla.
 *
 * Cómo modificarlo:
 *   - Añadir un paso: añade en el HTML un <li><label><input type="checkbox" data-k="nueva-clave"> Texto</label></li>.
 *     No hace falta tocar este archivo: el contador se adapta solo.
 *   - No cambies el data-k de un paso existente: se perdería lo marcado. Si cambias "club", cámbialo también en journey.js.
 */
(() => {
  'use strict';
  const { $, store, t } = Radio;
  const list = $('checklist');
  if (!list) return;

  // Estado guardado: un objeto { clave: marcada } que se modifica en el sitio y se vuelve a guardar entero.
  const KEY = 'radio.checklist';
  const state = store.get(KEY, {});
  const boxes = [...list.querySelectorAll('input[type=checkbox]')];
  /**
   * Actualiza el texto de #checkNote con el número de pasos marcados.
   * @returns {void}
   */
  const note = () => {
    const n = boxes.filter(b => b.checked).length;
    $('checkNote').textContent = n === boxes.length ? t('🎉 ¡Ya eres radioaficionado! 73.', '🎉 You’re a radio amateur now! 73.') : t(`${n} de ${boxes.length} pasos hechos. Se guarda en este navegador.`, `${n} of ${boxes.length} steps done. Saved in this browser.`);
  };
  // Al cargar: marca cada casilla según lo guardado (!! convierte "no existe" en false).
  // Al cambiar: guarda, actualiza el contador y avisa a journey.js con `radio:progress`.
  boxes.forEach(b => {
    b.checked = !!state[b.dataset.k];
    b.addEventListener('change', () => {
      state[b.dataset.k] = b.checked;
      store.set(KEY, state);
      note();
      document.dispatchEvent(new CustomEvent('radio:progress'));
    });
  });
  note();
})();
