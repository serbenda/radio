/**
 * antennas.js · Página Espectro, sección "Las antenas": dibujos, filtro por uso y "¿Cuánto mide la antena?".
 *
 * Página: Espectro (#antenas). Necesita:
 *  - #antGrid con tarjetas .ant[data-ant][data-f] y dentro un .ant-pics vacío (aquí se dibuja).
 *  - #antFilter (botones .chip con data-f) y #antCount (cuántas se ven, aria-live).
 *  - #sizeTool con #sizeFreq (range 0–1000), #sizeFreqOut, #sizeBars y #sizeOut.
 * Cada parte funciona sola si encuentra sus elementos.
 * Depende de: core.js (Radio.t, Radio.locale). No guarda nada, no usa servicios externos, no emite eventos.
 *
 * Dibujos (SVG generado, decorativo: aria-hidden; la información está en el texto de cada tarjeta):
 *  - SHAPE[id]: la forma de la antena en un lienzo de 120 × 90 (líneas ámbar = antena, gris = cable o mástil).
 *  - PATTERN[id]: el diagrama de radiación visto desde arriba, como función r(θ) de 0 a 1 que se dibuja en polar.
 *    θ = 0 es "hacia delante" (derecha del dibujo). Son formas didácticas, no medidas de un modelo concreto.
 * Filtro: cada tarjeta lleva en data-f las etiquetas hf (onda corta), vu (VHF/UHF), sat, rx (solo escuchar)
 *   y small (poco espacio); el botón "all" las muestra todas. Se oculta con el atributo hidden.
 * Tamaño: el deslizador va en escala logarítmica de 0,5 MHz a 3 GHz; λ = 300 / f (MHz) en metros.
 *
 * Cómo modificarlo:
 *  - Antena nueva: tarjeta en el HTML de las dos páginas (mismo data-ant) + una entrada en SHAPE y en PATTERN.
 *  - Comparaciones de tamaño: COMPARE (de mayor a menor; la primera cuyo límite sea menor que la media onda).
 */
(() => {
  'use strict';
  const { t } = Radio;
  const $ = id => document.getElementById(id);
  const A = '#f2b33d', G = '#9db0c7', L = '#27405f';
  const line = (x1, y1, x2, y2, c = A, w = 2.5) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const path = (d, c = A, w = 2.5, fill = 'none') => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ground = () => line(8, 84, 112, 84, L, 2);
  const mast = (x, y1, y2 = 84) => line(x, y1, x, y2, G, 2);

  /* ---------- Formas ---------- */
  const SHAPE = {
    dipole: () => mast(60, 30) + line(10, 30, 56, 30) + line(64, 30, 110, 30) + `<circle cx="60" cy="30" r="3" fill="${G}"/>`,
    invv: () => mast(60, 22) + line(60, 22, 18, 70) + line(60, 22, 102, 70) + ground(),
    gp: () => mast(60, 45) + line(60, 8, 60, 45) + line(60, 45, 28, 62) + line(60, 45, 92, 62) + line(60, 45, 46, 66) + line(60, 45, 74, 66),
    whip: () => `<rect x="48" y="50" width="24" height="34" rx="5" fill="${L}" stroke="${G}"/>` + path('M60 50 L60 12', A, 4),
    jpole: () => mast(60, 70) + path('M54 70 L54 10 M54 70 Q60 78 66 70 L66 40'),
    colinear: () => mast(60, 70) + line(60, 6, 60, 70) + [18, 36, 54].map(y => path(`M60 ${y} q6 3 0 6 q-6 3 0 6`, G, 2)).join(''),
    yagi: () => mast(60, 40) + line(14, 40, 110, 40, G, 2) + line(20, 18, 20, 62) + line(38, 22, 38, 58) + line(58, 25, 58, 55) + line(78, 26, 78, 54) + line(98, 27, 98, 53),
    moxon: () => mast(60, 45) + path('M28 25 L92 25 L92 38 M92 52 L92 65 L28 65 L28 52 M28 38 L28 25'),
    lpda: () => mast(60, 45) + line(12, 45, 112, 45, G, 2) + [[18, 30], [34, 25], [52, 20], [72, 15], [94, 10]].map(([x, h], i) => line(x, 45 - (i % 2 ? h : -h), x, 45)).join(''),
    discone: () => mast(60, 40) + line(36, 22, 84, 22) + line(60, 22, 60, 40, G, 2) + [30, 44, 60, 76, 90].map(x => line(60, 40, x, 76)).join(''),
    efhw: () => mast(14, 20) + line(14, 20, 104, 44) + `<rect x="8" y="16" width="12" height="10" fill="${L}" stroke="${G}"/>` + mast(104, 44),
    longwire: () => mast(12, 18) + mast(108, 26) + line(12, 18, 108, 26) + path('M12 18 Q12 50 22 84', G, 1.5),
    delta: () => mast(60, 10) + path('M60 10 L22 72 L98 72 Z'),
    magloop: () => mast(60, 74) + `<circle cx="60" cy="40" r="28" stroke="${A}" stroke-width="4" fill="none"/>` + `<rect x="54" y="66" width="12" height="10" fill="${L}" stroke="${G}"/>`,
    active: () => mast(60, 40) + line(60, 10, 60, 40) + `<rect x="52" y="40" width="16" height="12" rx="2" fill="${L}" stroke="${G}"/>`,
    ferrite: () => `<rect x="22" y="36" width="76" height="16" rx="8" fill="${L}" stroke="${G}"/>` + [34, 42, 50, 58, 66, 74, 82].map(x => line(x, 33, x - 3, 55, A, 2)).join(''),
    qfh: () => mast(60, 70) + path('M44 70 C44 50 76 40 76 14 M76 70 C76 50 44 40 44 14 M52 70 C40 46 70 36 66 14 M68 70 C80 46 50 36 54 14', A, 2),
    dish: () => mast(52, 52) + path('M30 14 Q74 45 30 76', A, 4) + line(40, 45, 92, 45, G, 1.5) + `<rect x="90" y="40" width="10" height="10" fill="${A}"/>`
  };

  /* ---------- Diagramas de radiación (vistos desde arriba) ---------- */
  const omni = () => 1;
  const PATTERN = {
    dipole: a => Math.abs(Math.sin(a)),
    invv: a => 0.72 + 0.28 * Math.abs(Math.sin(a)),
    gp: omni, whip: omni, jpole: omni, colinear: omni, discone: omni, active: omni, qfh: omni,
    yagi: a => Math.max(0, Math.cos(a)) ** 4 + 0.12 * Math.max(0, -Math.cos(a)) ** 4,
    moxon: a => ((1 + Math.cos(a)) / 2) ** 1.6,
    lpda: a => Math.max(0, Math.cos(a)) ** 2 + 0.1 * Math.max(0, -Math.cos(a)) ** 2,
    efhw: a => 0.55 + 0.45 * Math.abs(Math.cos(2 * a)),
    longwire: a => 0.25 + 0.75 * Math.abs(Math.sin(3 * a)),
    delta: a => Math.abs(Math.sin(a)),
    magloop: a => Math.abs(Math.cos(a)),
    ferrite: a => Math.abs(Math.sin(a)),
    dish: a => Math.max(0, Math.cos(a)) ** 40
  };
  /**
   * Dibuja un diagrama polar de 90 × 90 a partir de r(θ).
   * @param {function(number): number} r  Intensidad relativa (0…1) para el ángulo θ en radianes.
   * @returns {string} Marcado SVG.
   */
  function polar(r) {
    const cx = 45, cy = 45, R = 38, pts = [];
    for (let i = 0; i <= 180; i++) { const a = i / 180 * 2 * Math.PI, v = Math.max(0.02, r(a)) * R; pts.push(`${(cx + v * Math.cos(a)).toFixed(1)},${(cy - v * Math.sin(a)).toFixed(1)}`); }
    return `<circle cx="45" cy="45" r="38" fill="none" stroke="${L}"/><circle cx="45" cy="45" r="19" fill="none" stroke="${L}" stroke-dasharray="2 3"/>` +
      `<polygon points="${pts.join(' ')}" fill="#f2b33d33" stroke="${A}" stroke-width="1.5"/><circle cx="45" cy="45" r="2.5" fill="#ff5a4e"/>`;
  }

  const grid = $('antGrid');
  if (grid) {
    grid.querySelectorAll('.ant[data-ant]').forEach(card => {
      const id = card.dataset.ant, box = card.querySelector('.ant-pics');
      if (!box || !SHAPE[id]) return;
      box.setAttribute('aria-hidden', 'true');
      box.innerHTML = `<figure><svg viewBox="0 0 120 90" width="120" height="90">${SHAPE[id]()}</svg><figcaption>${t('Forma', 'Shape')}</figcaption></figure>` +
        `<figure><svg viewBox="0 0 90 90" width="90" height="90">${polar(PATTERN[id] || omni)}</svg><figcaption>${t('Radiación, desde arriba', 'Radiation, from above')}</figcaption></figure>`;
    });
  }

  /* ---------- Filtro por uso ---------- */
  const filter = $('antFilter'), count = $('antCount');
  /** Muestra solo las tarjetas con la etiqueta f (o todas con 'all') y dice cuántas quedan. */
  function apply(f) {
    const cards = grid.querySelectorAll('.ant');
    let n = 0;
    cards.forEach(c => { const show = f === 'all' || c.dataset.f.split(' ').includes(f); c.hidden = !show; if (show) n++; });
    filter.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    if (count) count.textContent = t(`${n} de ${cards.length} antenas`, `${n} of ${cards.length} antennas`);
  }
  if (grid && filter) {
    filter.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) apply(b.dataset.f); });
    apply('all');
  }

  /* ---------- ¿Cuánto mide la antena? ---------- */
  const range = $('sizeFreq');
  if (!range) return;
  const FMIN = Math.log10(0.5), FMAX = Math.log10(3000);
  // [límite en metros, comparación]: se usa la primera cuyo límite sea menor que la media onda.
  const COMPARE = [
    [100, t('más que un campo de fútbol', 'longer than a football pitch')],
    [40, t('como una piscina olímpica a lo largo', 'like the length of an Olympic pool')],
    [10, t('como un autobús o dos', 'like a bus or two')],
    [3, t('como un coche', 'like a car')],
    [1, t('como una persona tumbada', 'like a person lying down')],
    [0.3, t('como un brazo', 'like an arm')],
    [0.1, t('como un bolígrafo', 'like a pen')],
    [0, t('como un dedo o menos', 'like a finger or less')]
  ];
  const num = v => v.toLocaleString(Radio.locale, { maximumSignificantDigits: 3 });
  /** Texto de una longitud en metros, centímetros o milímetros. */
  const len = m => m >= 1 ? `${num(m)} m` : m >= 0.01 ? `${num(m * 100)} cm` : `${num(m * 1000)} mm`;
  /** Frecuencia legible desde MHz. */
  const freq = f => f < 1 ? `${num(f * 1000)} kHz` : f >= 1000 ? `${num(f / 1000)} GHz` : `${num(f)} MHz`;
  function update() {
    const f = 10 ** (FMIN + (range.value / 1000) * (FMAX - FMIN));
    const wl = 300 / f;
    $('sizeFreqOut').textContent = freq(f);
    range.setAttribute('aria-valuetext', freq(f));
    const cmp = COMPARE.find(([lim]) => wl / 2 >= lim)[1];
    $('sizeBars').innerHTML = [[1, t('Longitud de onda', 'Wavelength')], [0.5, t('Dipolo (½)', 'Dipole (½)')], [0.25, t('Vertical (¼)', 'Vertical (¼)')]]
      .map(([k, label]) => `<div class="size-row"><span>${label}</span><div class="size-bar" style="width:${k * 100}%"></div><b>${len(wl * k)}</b></div>`).join('');
    $('sizeOut').textContent = t(`A ${freq(f)} la onda mide ${len(wl)}: un dipolo de media onda mide ${len(wl / 2)}, ${cmp}, y una vertical de cuarto de onda, ${len(wl / 4)}.`,
      `At ${freq(f)} the wave is ${len(wl)} long: a half-wave dipole is ${len(wl / 2)}, ${cmp}, and a quarter-wave vertical is ${len(wl / 4)}.`);
  }
  range.addEventListener('input', update);
  update();
})();
