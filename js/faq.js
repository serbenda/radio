/**
 * faq.js · Preguntas frecuentes con <details> nativos (accesibles sin JavaScript extra).
 * Página: Empezar (#faqList). Datos: FAQ (data.js).
 */
(() => {
  'use strict';
  const list = Radio.$('faqList');
  if (!list) return;
  list.innerHTML = FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');
})();
