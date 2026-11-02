/**
 * morse-ui.js · Traductor de texto a Morse: lo escribe con puntos y rayas y lo hace sonar.
 *
 * Página: Practicar (/practicar/, sección #morse).
 * Elementos que necesita (practicar/index.html):
 *  - #morseIn    <input> de texto (máx. 60 caracteres). Si no existe, el módulo no hace nada.
 *  - #morseOut   Caja donde se pinta el código (un <span> por letra, un <i class="gap"> por espacio).
 *  - #morsePlay  Botón "▶ Escuchar".
 *  - #wpm        <input type="range"> de velocidad en ppm (8 a 30) y #wpmVal, donde se muestra su valor.
 *
 * Depende de: core.js (Radio.$) y morse.js (global Morse: encode y play). Debe cargarse después de ambos.
 * No guarda nada, no emite eventos y no usa servicios externos.
 *
 * Accesibilidad: los lectores de pantalla no leen bien "•—", así que #morseOut lleva un aria-label con el
 *   código dicho en palabras ("punto raya …"). El botón se desactiva mientras suena para evitar dobles clics.
 *
 * Textos visibles: en castellano e inglés con Radio.t(es, en) (ver docs/IDIOMAS.md).
 *
 * Cómo modificarlo:
 *  - Cambiar los símbolos que se ven (• y —): las dos llamadas a replace() de render().
 *  - Cambiar el rango de velocidad: atributos min/max/value de #wpm en practicar/index.html.
 *  - Cambiar el tono o el volumen: se hace en morse.js (play), no aquí.
 */
(() => {
  'use strict';
  const { $, t } = Radio;
  const input = $('morseIn');
  if (!input) return;

  /* ---------- Traducción en pantalla ---------- */

  /**
   * Pinta el código Morse del texto escrito en #morseOut y actualiza su aria-label.
   * Sustituye '.' por '•' y '-' por '—' solo para que se lea mejor; el texto vacío muestra una pista.
   * Se ejecuta al cargar y en cada pulsación (evento `input`).
   * @returns {void}
   */
  const render = () => {
    const code = Morse.encode(input.value);
    $('morseOut').innerHTML = code
      ? code.split(' ').map(w => w === '/' ? '<i class="gap"></i>' : `<span>${w.replace(/\./g, '•').replace(/-/g, '—')}</span>`).join('')
      : t('<em>Escribe algo arriba</em>', '<em>Type something above</em>');
    $('morseOut').setAttribute('aria-label', code ? t(`En Morse: ${code.replace(/\./g, 'punto ').replace(/-/g, 'raya ')}`, `In Morse: ${code.replace(/\./g, 'dot ').replace(/-/g, 'dash ')}`) : t('Vacío', 'Empty'));
  };
  input.addEventListener('input', render);
  render();

  /* ---------- Controles de sonido ---------- */

  // Muestra al lado del deslizador la velocidad elegida.
  $('wpm').addEventListener('input', e => { $('wpmVal').textContent = e.target.value; });
  // Reproduce el texto a la velocidad elegida (el "+" convierte el valor del deslizador en número).
  // Espera a que acabe el sonido (Promise de Morse.play) para volver a activar el botón.
  $('morsePlay').addEventListener('click', async () => {
    const btn = $('morsePlay');
    btn.disabled = true; btn.textContent = t('♪ Sonando…', '♪ Playing…');
    await Morse.play(input.value, +$('wpm').value);
    btn.disabled = false; btn.textContent = t('▶ Escuchar', '▶ Listen');
  });
})();
