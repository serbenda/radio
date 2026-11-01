/**
 * checklist.js · Lista de comprobación "de cero a indicativo".
 *
 * Página: Empezar (#checklist). Guarda en localStorage → "radio.checklist" ({ clave: true/false }).
 * journey.js lee la clave "club" para el paso "Contacta con un radioclub".
 */
(() => {
  'use strict';
  const { $, store } = Radio;
  const list = $('checklist');
  if (!list) return;

  const KEY = 'radio.checklist';
  const state = store.get(KEY, {});
  const boxes = [...list.querySelectorAll('input[type=checkbox]')];
  const note = () => {
    const n = boxes.filter(b => b.checked).length;
    $('checkNote').textContent = n === boxes.length ? '🎉 ¡Ya eres radioaficionado! 73.' : `${n} de ${boxes.length} pasos hechos. Se guarda en este navegador.`;
  };
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
