/**
 * family.js · Autotest "¿Es para mí?".
 *
 * Página: Empezar (#familias). Necesita: #fitQs, #fitResult.
 * Cinco preguntas de sí/no; según las respuestas recomienda secciones concretas de la web
 * (enlaces entre páginas construidos con Radio.url). No guarda nada.
 */
(() => {
  'use strict';
  if (!document.getElementById('fitQs')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const QS = [
    { id: 'maker', q: '¿Te gusta trastear con aparatos, cables o electrónica?', go: ['Cómo funciona la antena', 'entender/#como-funciona'], why: 'Construir antenas y montar tu estación es media afición.' },
    { id: 'dx', q: '¿Te llama hablar con gente de otros países?', go: ['Ahora en el aire', 'escuchar/#ahora'], why: 'Mira quién está hablando con quién ahora mismo y prueba tu primer contacto.' },
    { id: 'space', q: '¿Te interesan el espacio, los satélites o el Sol?', go: ['Cuándo pasa la ISS', 'entender/#iss'], why: 'La ISS, los satélites de radioaficionado y la propagación son tu sitio.' },
    { id: 'help', q: '¿Te gustaría poder ayudar en una emergencia?', go: ['El ejercicio de emergencia', 'practicar/#qso'], why: 'Prueba el contacto simulado de red de emergencia y lee cómo se organizan.' },
    { id: 'game', q: '¿Te gustan los retos, las colecciones y subir de nivel?', go: ['Tu primer mes', './#mes'], why: 'Insignias, Morse por niveles, concursos y parques: la radio tiene mucho de juego.' },
  ];
  const ans = {};
  function render() {
    $('fitQs').innerHTML = QS.map(q => `<div class="fq" data-id="${q.id}"><p>${q.q}</p>
      <div class="fq-btns"><button class="chip${ans[q.id] === true ? ' on' : ''}" data-v="1">Sí</button><button class="chip${ans[q.id] === false ? ' on' : ''}" data-v="0">No</button></div></div>`).join('');
    const answered = QS.filter(q => q.id in ans).length;
    if (answered < QS.length) { $('fitResult').innerHTML = `<p class="note">${answered} de ${QS.length} respondidas</p>`; return; }
    const yes = QS.filter(q => ans[q.id]);
    $('fitResult').innerHTML = yes.length
      ? `<p class="fit-big">${yes.length >= 3 ? '📻 Tienes alma de radioaficionado.' : '👍 La radio tiene un sitio para ti.'}</p>
         <p>Empieza por aquí:</p><ul>${yes.map(q => `<li><a href="${Radio.url(q.go[1])}">${q.go[0]}</a>: ${q.why}</li>`).join('')}</ul>`
      : `<p class="fit-big">🤔 Puede que no sea lo tuyo… o que aún no lo sepas.</p><p>Dale cinco minutos: <a href="${Radio.url('escuchar/#directo')}">escucha un receptor de verdad</a> y decide después.</p>`;
  }
  $('fitQs').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    ans[b.closest('.fq').dataset.id] = b.dataset.v === '1'; render();
  });
  render();
})();
