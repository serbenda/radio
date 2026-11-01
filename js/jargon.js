/**
 * jargon.js · Deletreo con el alfabeto fonético y lista de la jerga básica de radio.
 *
 * Página: Practicar (/practicar/, sección #jerga).
 * Elementos que necesita (practicar/index.html):
 *  - #phoneticIn   <input> donde se escribe un texto o indicativo. Si no existe, el módulo no hace nada.
 *  - #phoneticOut  Caja donde sale cada letra con su palabra (Alfa, Bravo…).
 *  - #glossary     <dl> donde se pinta la jerga (término <dt> y explicación <dd>).
 *
 * Depende de: core.js (Radio.$, Radio.esc) y data.js (globales PHONETIC y GLOSSARY). Cargar después de ambos.
 * No guarda nada, no emite eventos y no usa servicios externos.
 *
 * Datos (en js/data.js, no aquí):
 *  - PHONETIC: objeto { 'A': 'Alfa', …, '0': 'Cero', … }. Solo letras A-Z y cifras: lo que no esté
 *    (signos) no se deletrea y se omite. Las letras con tilde, y la Ñ, se deletrean como su letra base.
 *  - GLOSSARY: lista de pares [término, explicación]. La explicación puede llevar HTML sencillo (<b>, comillas
 *    tipográficas) porque se inserta tal cual: es contenido propio, nunca texto de la persona.
 *
 * Cómo modificarlo:
 *  - Añadir un término de jerga: una línea más en GLOSSARY de data.js, por ejemplo
 *    ['QRM', 'Interferencias causadas por otras estaciones.']. Aparece aquí sin tocar este archivo.
 *    Ojo: el bocadillo emergente de las demás páginas usa otra lista distinta (TERMS en glossary.js);
 *    si quieres que el término se explique también allí, añádelo en las dos.
 *  - Cambiar cómo se dice una letra o cifra: su valor en PHONETIC (data.js); también lo usa qso.js.
 */
(() => {
  'use strict';
  const { $, esc } = Radio;
  const input = $('phoneticIn');
  if (!input) return;

  /* ---------- Deletreo fonético ---------- */

  /**
   * Pinta en #phoneticOut cada carácter del texto con su palabra del alfabeto fonético.
   * Quita las tildes con NFD + borrado de marcas combinantes (U+0300–U+036F); la Ñ se convierte en N.
   * La letra se escapa con esc() porque viene de lo que escribe la persona; la palabra viene de data.js.
   * Si no queda nada que deletrear, muestra un ejemplo.
   * @returns {void}
   */
  const render = () => {
    // Quita tildes (Á → A) pero conserva la letra para deletrearla
    const txt = input.value.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    $('phoneticOut').innerHTML = txt.split('').map(c =>
      c === ' ' ? '<i class="gap"></i>' : PHONETIC[c] ? `<span><b>${esc(c)}</b>${PHONETIC[c]}</span>` : ''
    ).join('') || '<em>Ejemplo: EA4 → Echo Alfa Cuatro</em>';
  };
  input.addEventListener('input', render);
  render();

  /* ---------- Glosario ---------- */

  // Se pinta una sola vez al cargar. GLOSSARY es contenido propio (data.js), por eso no se escapa.
  $('glossary').innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('');
})();
