/**
 * morse-ui.js · Traductor de texto a Morse con sonido.
 *
 * Página: Practicar (#morse). Necesita: #morseIn, #morseOut, #morsePlay, #wpm, #wpmVal.
 * Depende de: morse.js (objeto global Morse).
 */
(() => {
  'use strict';
  const { $ } = Radio;
  const input = $('morseIn');
  if (!input) return;

  const render = () => {
    const code = Morse.encode(input.value);
    $('morseOut').innerHTML = code
      ? code.split(' ').map(w => w === '/' ? '<i class="gap"></i>' : `<span>${w.replace(/\./g, '•').replace(/-/g, '—')}</span>`).join('')
      : '<em>Escribe algo arriba</em>';
    $('morseOut').setAttribute('aria-label', code ? `En Morse: ${code.replace(/\./g, 'punto ').replace(/-/g, 'raya ')}` : 'Vacío');
  };
  input.addEventListener('input', render);
  render();

  $('wpm').addEventListener('input', e => { $('wpmVal').textContent = e.target.value; });
  $('morsePlay').addEventListener('click', async () => {
    const btn = $('morsePlay');
    btn.disabled = true; btn.textContent = '♪ Sonando…';
    await Morse.play(input.value, +$('wpm').value);
    btn.disabled = false; btn.textContent = '▶ Escuchar';
  });
})();
