/**
 * family.js · Autotest "¿Es para mí?": cinco preguntas de sí/no que recomiendan por dónde empezar.
 *
 * Página: empezar/index.html, sección #familias.
 * Elementos necesarios:
 *   #fitQs       contenedor donde se pintan las preguntas con sus botones Sí/No (si no existe, no hace nada).
 *   #fitResult   contenedor del resultado (o del contador "n de 5 respondidas").
 * Dependencias: Radio (js/core.js), solo Radio.url() para construir enlaces a otras páginas que funcionen
 *   esté donde esté la página actual.
 * Textos visibles: en castellano e inglés con Radio.t(es, en).
 * No guarda nada (las respuestas viven en memoria y se pierden al recargar) ni emite eventos.
 *
 * Cómo funciona: hasta responder las cinco solo se muestra el contador. Después:
 *   - 3 o más "sí": "Tienes alma de radioaficionado"; 1 o 2 "sí": "La radio tiene un sitio para ti".
 *   - Por cada "sí" se recomienda su enlace (`go`) con su explicación (`why`).
 *   - Ningún "sí": se propone escuchar un receptor de verdad (escuchar/#directo).
 *
 * Cómo modificarlo (lista QS):
 *   - Cada pregunta: { id: único, q: pregunta, go: [texto del enlace, 'pagina/#seccion'], why: explicación }.
 *   - La ruta de `go` es relativa a la raíz de la web (sin '/' inicial) y el #seccion debe existir en esa página.
 *   - Los textos se insertan como HTML sin escapar: son textos fijos del repositorio, no datos externos.
 *   - Si cambias el número de preguntas, revisa el umbral "3 o más" de render().
 */
(() => {
  'use strict';
  if (!document.getElementById('fitQs')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const { t } = Radio;
  // Preguntas del autotest. Formato explicado en la cabecera.
  const QS = [
    { id: 'maker', q: t('¿Te gusta trastear con aparatos, cables o electrónica?', 'Do you like tinkering with gadgets, cables or electronics?'), go: [t('Cómo funciona la antena', 'How the aerial works'), 'entender/#como-funciona'], why: t('Construir antenas y montar tu estación es media afición.', 'Building aerials and setting up your station is half the hobby.') },
    { id: 'dx', q: t('¿Te llama hablar con gente de otros países?', 'Does talking to people in other countries appeal to you?'), go: [t('Ahora en el aire', 'On the air now'), 'escuchar/#ahora'], why: t('Mira quién está hablando con quién ahora mismo y prueba tu primer contacto.', 'See who is talking to whom right now and try your first contact.') },
    { id: 'space', q: t('¿Te interesan el espacio, los satélites o el Sol?', 'Are you interested in space, satellites or the Sun?'), go: [t('Cuándo pasa la ISS', 'When the ISS passes over'), 'entender/#iss'], why: t('La ISS, los satélites de radioaficionado y la propagación son tu sitio.', 'The ISS, amateur radio satellites and propagation are your thing.') },
    { id: 'help', q: t('¿Te gustaría poder ayudar en una emergencia?', 'Would you like to be able to help in an emergency?'), go: [t('El ejercicio de emergencia', 'The emergency exercise'), 'practicar/#qso'], why: t('Prueba el contacto simulado de red de emergencia y lee cómo se organizan.', 'Try the simulated emergency net contact and read how they are organised.') },
    { id: 'game', q: t('¿Te gustan los retos, las colecciones y subir de nivel?', 'Do you like challenges, collecting things and levelling up?'), go: [t('Tu primer mes', 'Your first month'), './#mes'], why: t('Insignias, Morse por niveles, concursos y parques: la radio tiene mucho de juego.', 'Badges, Morse by levels, contests and parks: radio is a lot like a game.') },
  ];
  // Respuestas: { id de la pregunta: true (sí) | false (no) }. Una pregunta sin responder no está en el objeto.
  const ans = {};
  /**
   * Pinta las preguntas (marcando la respuesta elegida con la clase .on) y el resultado.
   * Se llama al cargar y después de cada respuesta; repinta todo, porque son solo cinco preguntas.
   * @returns {void}
   */
  function render() {
    $('fitQs').innerHTML = QS.map(q => `<div class="fq" data-id="${q.id}"><p>${q.q}</p>
      <div class="fq-btns"><button class="chip${ans[q.id] === true ? ' on' : ''}" data-v="1">${t('Sí', 'Yes')}</button><button class="chip${ans[q.id] === false ? ' on' : ''}" data-v="0">${t('No', 'No')}</button></div></div>`).join('');
    const answered = QS.filter(q => q.id in ans).length;
    if (answered < QS.length) { $('fitResult').innerHTML = `<p class="note">${t(`${answered} de ${QS.length} respondidas`, `${answered} of ${QS.length} answered`)}</p>`; return; }
    const yes = QS.filter(q => ans[q.id]);
    $('fitResult').innerHTML = yes.length
      ? `<p class="fit-big">${yes.length >= 3 ? t('📻 Tienes alma de radioaficionado.', '📻 You’re a radio amateur at heart.') : t('👍 La radio tiene un sitio para ti.', '👍 There’s a place for you in radio.')}</p>
         <p>${t('Empieza por aquí:', 'Start here:')}</p><ul>${yes.map(q => `<li><a href="${Radio.url(q.go[1])}">${q.go[0]}</a>: ${q.why}</li>`).join('')}</ul>`
      : t(`<p class="fit-big">🤔 Puede que no sea lo tuyo… o que aún no lo sepas.</p><p>Dale cinco minutos: <a href="${Radio.url('escuchar/#directo')}">escucha un receptor de verdad</a> y decide después.</p>`,
        `<p class="fit-big">🤔 Maybe it’s not for you… or you don’t know yet.</p><p>Give it five minutes: <a href="${Radio.url('escuchar/#directo')}">listen to a real receiver</a> and decide afterwards.</p>`);
  }
  // Un solo manejador para todos los botones (delegación): el id de la pregunta sale del .fq que lo contiene
  // y la respuesta de data-v ("1" = sí, "0" = no).
  $('fitQs').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    ans[b.closest('.fq').dataset.id] = b.dataset.v === '1'; render();
  });
  render();
})();
