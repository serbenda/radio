/**
 * jargon.js · Deletreo con el alfabeto fonético y glosario de jerga.
 *
 * Página: Practicar (#jerga). Necesita: #phoneticIn, #phoneticOut, #glossary.
 * Datos: PHONETIC y GLOSSARY (data.js).
 */
(() => {
  'use strict';
  const { $, esc } = Radio;
  const input = $('phoneticIn');
  if (!input) return;

  const render = () => {
    // Quita tildes (Á → A) pero conserva la letra para deletrearla
    const txt = input.value.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    $('phoneticOut').innerHTML = txt.split('').map(c =>
      c === ' ' ? '<i class="gap"></i>' : PHONETIC[c] ? `<span><b>${esc(c)}</b>${PHONETIC[c]}</span>` : ''
    ).join('') || '<em>Ejemplo: EA4 → Echo Alfa Cuatro</em>';
  };
  input.addEventListener('input', render);
  render();

  $('glossary').innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('');
})();
