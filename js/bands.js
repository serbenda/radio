/**
 * bands.js · Las bandas de radioaficionado, de 160 m a 70 cm.
 *
 * Página: Entender (#bandas). Necesita: #bands, #bandDetail. Datos: BANDS (data.js).
 * Depende de: Radio ($) de core.js.
 * Cada banda es un botón; al pulsarlo se muestra su rango, cuándo funciona y qué se oye.
 * Accesibilidad: botones <button> con aria-pressed (la banda elegida está a "true").
 * No guarda nada, no emite eventos y no usa servicios externos.
 * Textos: en los dos idiomas con Radio.t (los de BANDS ya llegan traducidos desde data.js).
 *
 * Cómo modificarlo:
 *  - Añadir o corregir una banda: BANDS en data.js (aparece aquí sola, en el mismo orden).
 *  - Nuevo tipo de banda (p. ej. 'shf'): añade su nombre visible a KIND y su color en el CSS (.band.shf).
 *  - Banda que se muestra al cargar: el número de `show(2)` es su posición en BANDS, empezando en 0.
 */
(() => {
  'use strict';
  const { $, t } = Radio;
  const list = $('bands');
  if (!list) return;

  // Tipo de banda (campo `kind` de BANDS) → nombre que se muestra en el detalle.
  const KIND = { hf: t('Onda corta (HF)', 'Shortwave (HF)'), vhf: 'VHF', uhf: 'UHF' };
  // Un botón por banda. La clase con el tipo (hf, vhf, uhf) le da su color; data-i es su posición en BANDS.
  list.innerHTML = BANDS.map((b, i) =>
    `<button class="band ${b.kind}" type="button" data-i="${i}" aria-pressed="false"><b>${b.name}</b><small>${b.from}–${b.to} MHz</small></button>`).join('');

  /**
   * Muestra el detalle de una banda y marca su botón como pulsado.
   * @param {number} i  Posición de la banda en BANDS.
   * Efectos: reescribe #bandDetail y el aria-pressed de todos los botones. Los textos de BANDS son
   *   contenido propio, por eso van sin escapar.
   */
  function show(i) {
    const b = BANDS[i];
    list.querySelectorAll('.band').forEach(el => el.setAttribute('aria-pressed', String(+el.dataset.i === i)));
    $('bandDetail').innerHTML = `<h3>${b.name} <span>${KIND[b.kind]} · ${b.from}–${b.to} MHz</span></h3>
      <p><strong>${t('Mejor momento', 'Best time')}:</strong> ${b.when}</p><p>${b.text}</p>`;
  }
  // Delegación: un único manejador para todos los botones. "+" convierte data-i (texto) en número.
  list.addEventListener('click', e => { const b = e.target.closest('.band'); if (b) show(+b.dataset.i); });
  show(2); // 40 m, la mejor para empezar
})();
