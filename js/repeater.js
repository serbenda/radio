/**
 * repeater.js · Calculadora de desplazamiento de repetidores (Practicar, #repetidores).
 *
 * Necesita: #repOut (frecuencia de salida en MHz) y #repResult. Textos con Radio.t. No guarda nada.
 * Regla del plan de banda de la IARU Región 1, la que se usa en España:
 *  - 2 m (144-146 MHz): repetidores con salida en 145,600-145,800 MHz → entrada 600 kHz más abajo.
 *  - 70 cm (430-440 MHz): salida en 438-440 MHz → entrada 7,6 MHz más abajo.
 * Cualquier otra frecuencia se trata como símplex (sin desplazamiento) y se avisa.
 * Acepta coma o punto decimal ("145,650" o "145.650").
 * Cómo modificarlo: cambia RULES si cambia el plan de banda.
 */
(() => {
  'use strict';
  const input = document.getElementById('repOut');
  if (!input) return;
  const { $, t } = Radio;
  /** [desde MHz, hasta MHz, desplazamiento MHz, banda]. */
  const RULES = [[145.5875, 145.8, -0.6, '2 m'], [438, 440, -7.6, '70 cm']];
  const fmt = n => n.toLocaleString(Radio.locale, { minimumFractionDigits: 3, maximumFractionDigits: 4 });

  /** Calcula la frecuencia de entrada y la escribe en #repResult. */
  function calc() {
    const f = parseFloat(input.value.replace(',', '.'));
    if (!f) { $('repResult').textContent = ''; return; }
    const r = RULES.find(([a, b]) => f >= a && f <= b);
    $('repResult').innerHTML = r
      ? t(`Repetidor de ${r[3]}: escuchas en <b>${fmt(f)} MHz</b> y transmites en <b>${fmt(f + r[2])} MHz</b> (desplazamiento ${fmt(r[2])} MHz). Comprueba si necesita tono.`,
          `${r[3]} repeater: listen on <b>${fmt(f)} MHz</b> and transmit on <b>${fmt(f + r[2])} MHz</b> (offset ${fmt(r[2])} MHz). Check whether it needs a tone.`)
      : t('Esa frecuencia no está en los segmentos de repetidores de 2 m (145,600-145,800) ni de 70 cm (438-440): probablemente es símplex, sin desplazamiento.',
          'That frequency isn’t in the 2 m (145.600–145.800) or 70 cm (438–440) repeater segments: it’s probably simplex, with no offset.');
  }
  input.addEventListener('input', calc);
})();
