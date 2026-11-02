/**
 * faq.js · Preguntas frecuentes con <details> nativos (se abren y cierran sin JavaScript extra y
 * son accesibles con teclado y lector de pantalla por defecto).
 *
 * Página: empezar/index.html. Elemento necesario: #faqList (contenedor vacío; si no existe, no hace nada).
 * Dependencias: Radio (js/core.js) para Radio.$; datos FAQ (js/data.js): lista de pares [pregunta, respuesta].
 * No guarda nada ni emite eventos.
 *
 * Ojo: la pregunta y la respuesta se insertan como HTML SIN escapar, a propósito, para que se pueda usar
 * HTML (un enlace, una negrita) en las respuestas si hace falta. Por eso FAQ solo debe contener texto escrito en el repositorio,
 * nunca datos que vengan de fuera.
 *
 * Textos: FAQ ya llega en el idioma de la página (cada pregunta y respuesta va con t() en data.js).
 *
 * Cómo modificarlo: para añadir o cambiar preguntas edita FAQ en js/data.js; este archivo no cambia.
 */
(() => {
  'use strict';
  const list = Radio.$('faqList');
  if (!list) return;
  // Un <details> por pregunta: <summary> es la pregunta (lo que se pulsa) y <p> la respuesta.
  list.innerHTML = FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');
})();
