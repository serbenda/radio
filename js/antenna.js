/**
 * antenna.js · Calculadora de antenas y de pérdidas del cable (Empezar, #estacion).
 *
 * Necesita: #antBand (banda), #antFreq (frecuencia libre en MHz, opcional), #antOut, #coaxType, #coaxLen,
 * #coaxOut. Textos con Radio.t; números con Radio.locale. No guarda nada.
 *
 * Fórmulas (longitudes en metros, f en MHz; 300 / f es la longitud de onda en el vacío):
 *  - Dipolo de media onda: total ≈ 143 / f (un 5 % más corto que λ/2 por el efecto de los extremos);
 *    cada brazo, la mitad. Se alimenta por el centro con coaxial de 50 Ω (con un balun 1:1, mejor).
 *  - Vertical de cuarto de onda (ground plane): radiante ≈ 71,5 / f; radiales ≈ 75 / f (al menos 3-4).
 *    En VHF/UHF los radiales se inclinan unos 45° hacia abajo para acercarse a 50 Ω.
 *  - Pérdida del coaxial: dB por 100 m a 100 MHz (valor del <option>), escalada con √(f / 100), que es
 *    como crece la pérdida en el conductor. Porcentaje de potencia que llega: 10^(−dB / 10).
 * Cómo modificarlo: añade bandas en el <select id="antBand"> del HTML (value = MHz con punto) y cables en
 * #coaxType (value = dB/100 m a 100 MHz).
 */
(() => {
  'use strict';
  const band = document.getElementById('antBand');
  if (!band) return;
  const { $, t } = Radio;
  const num = (n, d = 2) => n.toLocaleString(Radio.locale, { maximumFractionDigits: d, minimumFractionDigits: d > 0 && n < 10 ? Math.min(d, 2) : 0 });
  /** Frecuencia con tres decimales, como en el dial: 7,100 · 145,000. */
  const mhz = f => f.toLocaleString(Radio.locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  /** Longitud legible: en cm por debajo de 1 m; en m por encima. */
  const len = m => (m < 1 ? `${num(m * 100, 0)} cm` : `${num(m, m < 10 ? 2 : 1)} m`);

  /** Frecuencia activa: la escrita a mano si es válida (1-1000 MHz); si no, la de la banda elegida. */
  function freq() {
    const f = parseFloat($('antFreq').value.replace(',', '.'));
    return f >= 1 && f <= 1000 ? f : parseFloat(band.value);
  }

  /** Recalcula antenas y pérdidas del cable. */
  function calc() {
    const f = freq();
    const dip = 143 / f, rad = 71.5 / f, radl = 75 / f;
    $('antOut').innerHTML = `
      <p><b>${t('Dipolo de media onda', 'Half-wave dipole')}</b> · ${mhz(f)} MHz<br>${t('Longitud total', 'Total length')} <b>${len(dip)}</b> · ${t('cada brazo', 'each leg')} <b>${len(dip / 2)}</b></p>
      <p><b>${t('Vertical de cuarto de onda', 'Quarter-wave vertical')}</b><br>${t('Radiante', 'Radiator')} <b>${len(rad)}</b> · ${t('radiales (3 o 4)', 'radials (3 or 4)')} <b>${len(radl)}</b>${f > 50 ? t(', inclinados unos 45°', ', sloping down about 45°') : ''}</p>
      ${dip > 30 ? `<p class="note">${t('En bandas bajas un dipolo es largo: se puede montar en «V invertida» (el centro alto y los extremos bajando), que ocupa menos.', 'On the low bands a dipole is long: you can rig it as an “inverted V” (centre high, ends sloping down), which takes less room.')}</p>` : ''}`;
    const ref = parseFloat($('coaxType').value), m = parseFloat($('coaxLen').value.replace(',', '.')) || 0;
    const db = ref * Math.sqrt(f / 100) * m / 100, kept = Math.pow(10, -db / 10) * 100;
    $('coaxOut').innerHTML = t(`Con ${num(m, 0)} m a ${mhz(f)} MHz pierdes unos <b>${num(db, 1)} dB</b>: llega a la antena el <b>${num(kept, 0)} %</b> de tu potencia.`,
      `With ${num(m, 0)} m at ${mhz(f)} MHz you lose about <b>${num(db, 1)} dB</b>: <b>${num(kept, 0)}%</b> of your power reaches the antenna.`);
  }
  ['antBand', 'coaxType'].forEach(id => $(id).addEventListener('change', () => { if (id === 'antBand') $('antFreq').value = ''; calc(); }));
  ['antFreq', 'coaxLen'].forEach(id => $(id).addEventListener('input', calc));
  calc();
})();
