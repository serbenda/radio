/**
 * bands.js · Las bandas de radioaficionado, de 160 m a 70 cm.
 *
 * Página: Entender (#bandas). Necesita: #bands, #bandDetail. Datos: BANDS (data.js).
 * Cada banda es un botón; al pulsarlo se muestra su rango, cuándo funciona y qué se oye.
 */
(() => {
  'use strict';
  const { $ } = Radio;
  const list = $('bands');
  if (!list) return;

  const KIND = { hf: 'Onda corta (HF)', vhf: 'VHF', uhf: 'UHF' };
  list.innerHTML = BANDS.map((b, i) =>
    `<button class="band ${b.kind}" type="button" data-i="${i}" aria-pressed="false"><b>${b.name}</b><small>${b.from}–${b.to} MHz</small></button>`).join('');

  function show(i) {
    const b = BANDS[i];
    list.querySelectorAll('.band').forEach(el => el.setAttribute('aria-pressed', String(+el.dataset.i === i)));
    $('bandDetail').innerHTML = `<h3>${b.name} <span>${KIND[b.kind]} · ${b.from}–${b.to} MHz</span></h3>
      <p><strong>Mejor momento:</strong> ${b.when}</p><p>${b.text}</p>`;
  }
  list.addEventListener('click', e => { const b = e.target.closest('.band'); if (b) show(+b.dataset.i); });
  show(2); // 40 m, la mejor para empezar
})();
