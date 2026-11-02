/**
 * classroom.js · "La radio en clase": imprime la ficha para el aula.
 *
 * Página: Empezar (#docentes), en castellano y en inglés. Necesita: #printSheet (botón) y #worksheet (la ficha,
 * oculta en pantalla). No guarda nada. Hito de métricas: docentes/ficha (con Radio.track) al pulsar imprimir.
 *
 * Cómo funciona: añade la clase "printing-sheet" al <body> y abre el diálogo de impresión del navegador;
 * las reglas @media print de style.css (sección "La radio en clase") ocultan todo lo demás y muestran solo
 * #worksheet, en blanco y negro. Al cerrar el diálogo (evento afterprint) se quita la clase.
 * Si la persona imprime la página con el menú del navegador (sin el botón), se imprime la página normal.
 *
 * Cómo modificarlo: el contenido de la ficha está en el HTML de empezar/index.html y en/start/index.html
 * (bloque #worksheet); el aspecto impreso, en css/style.css.
 */
(() => {
  'use strict';
  const btn = document.getElementById('printSheet');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.body.classList.add('printing-sheet');
    Radio.track('docentes/ficha');
    window.print();
  });
  addEventListener('afterprint', () => document.body.classList.remove('printing-sheet'));
})();
