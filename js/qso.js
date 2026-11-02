/**
 * qso.js · Contactos de radio (QSO) simulados paso a paso y tarjeta QSL de recuerdo.
 *
 * Página: Practicar (/practicar/, sección #qso; si no existe, el módulo no hace nada).
 * Elementos que necesita (practicar/index.html):
 *  - #qsoSetup     <form> inicial con #qsoName, #qsoCity, #qsoCall (indicativo de prácticas),
 *                  #qsoScenario (<select> de escenario) y #qsoVoice (casilla "Oír a la otra estación").
 *  - #qsoRadio     Panel del contacto (clase "rx" mientras recibe), con #qsoOnAir (estado: EN EL AIRE,
 *                  RECIBIENDO, TU TURNO…), #qsoFreq (frecuencia y modo), #qsoLog (<ol aria-live> de la conversación)
 *                  y #qsoChoices (las tres opciones de cada turno).
 *  - #qsoQsl       Bloque de la tarjeta, con #qslCanvas (<canvas width="900" height="560">), #qslShare,
 *                  #qslDownload y #qsoAgain ("Otro contacto").
 *
 * Depende de: core.js (Radio.track) y data.js (global PHONETIC, para deletrear indicativos).
 *
 * Escenarios (valor del <select> → función del guion):
 *  - primero     → run()           Charla con una estación hispanohablante de otro país (STATIONS). Da QSL.
 *  - concurso    → runContest()    Contacto rápido de concurso: control y número de serie. Da QSL.
 *  - pota        → runPota()       "Cazar" una estación portátil en un parque natural. Da QSL.
 *  - emergencia  → runEmergency()  Red dirigida de un ejercicio de emergencias, en 2 m FM. Sin QSL.
 *  - iss         → runIss()        Contacto con la Estación Espacial (NA1SS) en 145,800 MHz FM. Da QSL.
 * Cada guion alterna receive() (habla la otra estación) y choose() (eliges qué transmitir entre tres opciones;
 * las incorrectas se desactivan y explican por qué, y puedes volver a elegir). Termina con finish().
 * Los indicativos de las estaciones virtuales se generan al azar en cada contacto.
 *
 * Banda y frecuencia (start()): de 8:00 a 17:59 UTC, 20 m en USB (14,150-14,290 MHz); el resto, 40 m en LSB
 * (7,090-7,180 MHz). Concurso, emergencia e ISS fijan las suyas.
 *
 * Audio:
 *  - Voz de la otra estación con la síntesis de voz del navegador (speechSynthesis), en la variante de español
 *    de su país si el sistema la tiene. Sin la casilla #qsoVoice o sin soporte, se espera 0,9 s en su lugar.
 *  - Ruido de banda de fondo con Web Audio: 2 s de ruido blanco en bucle → filtro paso banda de 1.400 Hz →
 *    ganancia → altavoces. Volumen 0,012 de fondo y 0,05 mientras habla la otra estación.
 *
 * Tarjeta QSL: se dibuja en el <canvas> de 900 × 560 px y se descarga como PNG o se comparte como archivo con la
 *   Web Share API (el botón solo aparece si el navegador permite compartir archivos, normalmente en móvil).
 *
 * No guarda nada en localStorage (el nombre, la ciudad y el indicativo solo viven en memoria).
 * Eventos: `radio:qso` con detail { scenario } al terminar cualquier contacto; journey.js lo registra
 *   ("Haz tu primer contacto", "Prueba 3 tipos"). Hitos de métricas (con Radio.track): 'qso/<escenario>' y
 *   'qsl/descargada'.
 * No usa servicios externos.
 * Accesibilidad: todo se maneja con botones y el formulario; lo que dice la otra estación también se escribe
 *   en #qsoLog (aria-live="polite": se anuncia), así que el contacto se puede hacer sin sonido.
 *
 * Textos visibles: en castellano e inglés con Radio.t(es, en) (ver docs/IDIOMAS.md). En inglés la otra
 *   estación habla inglés (voz en-GB, o en-US si su campo langEn lo dice) y la QSL sale con etiquetas en inglés.
 *
 * Cómo modificarlo:
 *  - Añadir un escenario: (1) un <option value="mi-id"> en #qsoScenario (practicar/index.html); (2) en start(),
 *    una línea `if (scenario === 'mi-id') { dx = …; band = …; mode = …; freq = …; }`; (3) una función
 *    `async function runMiId()` que use add/receive/choose/finish como las demás; (4) su entrada en el objeto
 *    del final de start() ({ …, 'mi-id': runMiId }). journey.js lo contará solo como un tipo más.
 *  - Añadir una estación extranjera para "primero": una entrada en STATIONS (campos explicados encima).
 *  - Cambiar un turno: edita la lista de opciones de su choose() ({ ok, text, why }, ver choose()).
 *  - Cambiar el diseño de la tarjeta: showQsl() (coordenadas en píxeles del lienzo de 900 × 560).
 */
(() => {
  'use strict';
  if (!document.getElementById('qso')) return; // esta página no tiene la sección
  /* ---------- Utilidades ---------- */
  const $ = id => document.getElementById(id);
  const { t } = Radio;
  /**
   * Escapa texto para meterlo en HTML (& < > " '). Imprescindible aquí: nombre y ciudad los escribe la persona.
   * @param {*} s Valor a escapar.
   * @returns {string}
   */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /**
   * Elemento al azar de una lista.
   * @template T
   * @param {T[]} a Lista.
   * @returns {T}
   */
  const pick = a => a[Math.floor(Math.random() * a.length)];
  /**
   * n letras mayúsculas al azar (A-Z; 65 es el código de la "A"). Sirve para el sufijo de los indicativos.
   * @param {number} n Cuántas letras.
   * @returns {string}
   */
  const letters = n => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

  /* ---------- Estaciones virtuales ---------- */

  /**
   * Estaciones hispanohablantes de otros países para el escenario "primero". El indicativo final es
   * prefix + 2 o 3 letras al azar (por ejemplo LU1ABC). Campos:
   *  - prefix   Prefijo del país (con su número de zona).     · country  País o región, para los textos.
   *  - op       Nombre del operador.                          · city     Ciudad desde la que transmite.
   *  - tz       Zona horaria IANA: con ella dice la hora local de su país ("Aquí son las…").
   *  - lang     Idioma de la voz (BCP 47); si el sistema no tiene esa variante se usa es-ES u otra en español.
   *  - langEn   Voz en la página en inglés: 'en-GB' o 'en-US' (si falta, en-GB).
   *  - flag     Emoji de la bandera que se ve junto a su indicativo en la conversación.
   * Para añadir una, copia una línea y cambia los valores.
   */
  const STATIONS = [
    { prefix: 'EA8', country: t('Canarias', 'the Canary Islands'), op: 'Carmen', city: 'Santa Cruz de Tenerife', tz: 'Atlantic/Canary', lang: 'es-ES', langEn: 'en-GB', flag: '🇮🇨' },
    { prefix: 'LU1', country: 'Argentina', op: 'Ricardo', city: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', lang: 'es-AR', langEn: 'en-US', flag: '🇦🇷' },
    { prefix: 'XE1', country: t('México', 'Mexico'), op: 'Lupita', city: 'Guadalajara', tz: 'America/Mexico_City', lang: 'es-MX', langEn: 'en-US', flag: '🇲🇽' },
    { prefix: 'CE3', country: 'Chile', op: 'Andrés', city: 'Valparaíso', tz: 'America/Santiago', lang: 'es-CL', langEn: 'en-US', flag: '🇨🇱' },
    { prefix: 'HK4', country: 'Colombia', op: 'Jorge', city: 'Medellín', tz: 'America/Bogota', lang: 'es-CO', langEn: 'en-US', flag: '🇨🇴' },
    { prefix: 'CO2', country: 'Cuba', op: 'Yoel', city: t('La Habana', 'Havana'), tz: 'America/Havana', lang: 'es-US', langEn: 'en-US', flag: '🇨🇺' },
  ];

  /**
   * Deletrea un indicativo con el alfabeto fonético de data.js ("EA4" → "Echo Alfa Cuatro").
   * Los caracteres sin palabra (como "/") se dejan tal cual.
   * @param {string} call Indicativo en mayúsculas.
   * @returns {string}
   */
  const spell = call => call.split('').map(c => PHONETIC[c] || c).join(' ');
  /**
   * Indicativo seguido de su deletreo entre paréntesis: "EA4ABC (Echo Alfa Cuatro …)".
   * speak() convierte los paréntesis en pausas para que la voz no los lea.
   * @param {string} call Indicativo.
   * @returns {string}
   */
  const say = call => `${call} (${spell(call)})`;

  // Estado del contacto en curso:
  //  me      { name, city, call } de la persona (del formulario);  dx  la otra estación (mismos campos que STATIONS + call);
  //  band, freq, mode  datos para la conversación y la QSL;  rst  control de señal que te dan ('59', '57'…);
  //  log     elementos <li> añadidos a la conversación;  sending  true mientras habla la otra estación
  //          (choose() ignora los clics);  scenario  escenario elegido.
  let me, dx, band, freq, mode, rst = '59', log, sending = false, scenario = 'primero';

  /* ---------- Audio: voz + ruido de banda ---------- */
  // ctx: AudioContext (se crea al empezar el primer contacto, tras el clic de la persona, que es cuando el
  // navegador permite sonar). noiseGain: volumen del ruido; si existe, el ruido ya está sonando.
  let ctx, noiseGain;
  /**
   * Arranca el ruido de banda la primera vez (después solo reanuda el AudioContext). Empieza en silencio
   * (ganancia 0); el volumen lo pone noise(). Si el navegador no tiene Web Audio, se sigue sin ruido.
   * Efectos: crea nodos de audio que suenan en bucle hasta cerrar la página (con volumen 0 al terminar).
   * @returns {void}
   */
  function startNoise() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (noiseGain) return;
      // 2 segundos de ruido blanco (valores al azar entre −1 y 1) en un búfer mono que se repite.
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      // Filtro paso banda centrado en 1.400 Hz y ancho (Q 0,7): deja el "shhh" típico de un receptor de voz.
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.7;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      src.connect(bp).connect(noiseGain).connect(ctx.destination);
      src.start();
    } catch (e) { /* sin audio */ }
  }
  /**
   * Cambia el volumen del ruido con una transición suave (constante de tiempo 0,08 s) para que no chasquee.
   * @param {number} level Ganancia: 0 silencio, 0,012 fondo, 0,05 mientras habla la otra estación.
   * @returns {void}
   */
  function noise(level) { if (noiseGain) noiseGain.gain.setTargetAtTime(level, ctx.currentTime, 0.08); }
  /**
   * Silencia el ruido (no lo destruye: así el siguiente contacto lo reutiliza).
   * @returns {void}
   */
  function stopNoise() { noise(0); }

  /**
   * Elige la voz del sistema para un idioma: la variante exacta (es-AR…), si no es-ES, si no cualquier
   * voz en español, y si no hay ninguna, null (el navegador usará la suya por defecto).
   * En inglés, igual: la variante exacta (en-US…), si no en-GB, si no cualquier voz en inglés.
   * @param {string} lang Etiqueta BCP 47, por ejemplo "es-MX".
   * @returns {SpeechSynthesisVoice|null}
   */
  function voiceFor(lang) {
    const base = lang.slice(0, 2).toLowerCase(), main = base === 'en' ? 'en-GB' : 'es-ES';
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(base));
    const norm = x => x.replace('_', '-').toLowerCase();
    return vs.find(v => norm(v.lang) === lang.toLowerCase()) || vs.find(v => norm(v.lang) === main.toLowerCase()) || vs[0] || null;
  }
  /**
   * Idioma de la voz de la otra estación: el de su país en castellano; en la página en inglés, inglés
   * (langEn de la estación, o en-GB).
   * @returns {string} Etiqueta BCP 47.
   */
  const voiceLang = () => (Radio.lang === 'en' ? dx.langEn || 'en-GB' : dx.lang);
  /**
   * Hace hablar a la otra estación y sube el ruido mientras habla.
   * Los paréntesis del texto se cambian por comas (pausas) para que el deletreo suene natural.
   * La Promise se resuelve al acabar de hablar, si hay error o, como red de seguridad, a los 20 s (algunos
   * navegadores no avisan del final). Sin voz activada o sin soporte, espera 0,9 s.
   * Efectos: cancela cualquier frase anterior; deja el ruido en el nivel de fondo al terminar.
   * @param {string} text Texto a decir.
   * @returns {Promise<void>}
   */
  function speak(text) {
    return new Promise(resolve => {
      if (!$('qsoVoice').checked || !('speechSynthesis' in window)) { setTimeout(resolve, 900); return; }
      const u = new SpeechSynthesisUtterance(text.replace(/\(([^)]*)\)/g, ', $1,'));
      const lang = voiceLang();
      u.lang = lang; u.rate = 1.02; u.pitch = 1;
      const v = voiceFor(lang); if (v) u.voice = v;
      u.onend = u.onerror = resolve;
      noise(0.05);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setTimeout(resolve, 20000); // por si el navegador no avisa del final
    }).then(() => noise(0.012));
  }

  /* ---------- Registro de la conversación ---------- */
  /**
   * Añade una línea a la conversación (#qsoLog) y la desplaza a la vista.
   * @param {'rx'|'tx'|'info'} who rx = habla la otra estación, tx = tú, info = nota del narrador. Es también la clase CSS.
   * @param {string} html Contenido YA ESCAPADO o HTML propio (quien llama es responsable de escapar).
   * @returns {HTMLLIElement} La línea creada (receive() la rellena después).
   */
  function add(who, html) {
    const li = document.createElement('li');
    li.className = who;
    const label = { rx: `${dx.flag} ${dx.call}`, tx: `🎙️ ${me.call}`, info: '📻' }[who];
    li.innerHTML = `<span class="who">${esc(label)}</span><p>${html}</p>`;
    $('qsoLog').appendChild(li);
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    log.push(li);
    return li;
  }

  /**
   * Turno de la otra estación: borra las opciones, muestra "RECIBIENDO", pone "· · ·" 0,7 s (como si
   * empezara a llegar la señal), escribe el texto y lo dice en voz alta. Al terminar, "TU TURNO".
   * Mientras dura, `sending` impide responder.
   * @param {string} text Lo que dice (texto plano; se escapa aquí).
   * @returns {Promise<void>}
   */
  async function receive(text) {
    sending = true;
    $('qsoChoices').innerHTML = '';
    $('qsoRadio').classList.add('rx');
    $('qsoOnAir').textContent = t('RECIBIENDO', 'RECEIVING');
    const li = add('rx', '<em>· · ·</em>');
    await new Promise(r => setTimeout(r, 700));
    li.querySelector('p').innerHTML = esc(text);
    await speak(text);
    $('qsoRadio').classList.remove('rx');
    $('qsoOnAir').textContent = t('TU TURNO', 'YOUR TURN');
    sending = false;
  }

  /**
   * Turno de la persona: muestra las opciones y espera a que elija la correcta.
   * Cada opción es { ok: boolean, text: lo que se transmite, why: explicación }. Las incorrectas se
   * marcan, se desactivan y muestran su `why` como consejo; se puede seguir probando. La correcta se escribe
   * en la conversación como "tx" y, si tiene `why`, debajo como nota. Conviene que haya exactamente una
   * correcta; el orden en que se escriben es el orden en pantalla (no se barajan).
   * @param {{ok: boolean, text: string, why?: string}[]} options Opciones del turno.
   * @returns {Promise<void>} Se resuelve al elegir la correcta.
   */
  function choose(options) {
    const box = $('qsoChoices');
    box.innerHTML = t('<p class="qso-ask">¿Qué transmites?</p>', '<p class="qso-ask">What do you transmit?</p>') + options.map((o, i) =>
      `<button class="opt wide" data-i="${i}">${esc(o.text)}</button>`).join('') + '<p class="qso-tip" id="qsoTip"></p>';
    return new Promise(resolve => {
      box.onclick = e => {
        const b = e.target.closest('.opt');
        if (!b || sending) return;
        const o = options[+b.dataset.i];
        if (!o.ok) {
          b.classList.add('wrong'); b.disabled = true;
          $('qsoTip').innerHTML = '✋ ' + esc(o.why);
          return;
        }
        box.onclick = null;
        box.innerHTML = '';
        add('tx', esc(o.text));
        if (o.why) add('info', esc(o.why));
        resolve();
      };
    });
  }

  /* ---------- El guion del contacto ---------- */
  /**
   * Escenario "primero": el contacto completo de charla, el más largo. Pasos: preguntar si la frecuencia está
   * libre (QRL?), llamar CQ, recibir respuesta, pasar control de señal (RS), nombre y QTH, recibir los suyos y
   * despedirse con 73.
   * @returns {Promise<void>}
   */
  async function run() {
    const theirName = dx.op, call = me.call, them = dx.call;
    // El control que te da la otra estación varía al azar; `rst` ('57', '58' o '59') es el que irá en la QSL.
    rst = pick(['57', '58', '59']);
    const rstMe = t(`${rst[0]} y ${rst[1]}`, `${rst[0]} and ${rst[1]}`);
    // Hora local de la otra estación, para que diga "Aquí son las…".
    const theirTime = new Intl.DateTimeFormat(Radio.locale, { hour: '2-digit', minute: '2-digit', timeZone: dx.tz }).format(new Date());

    add('info', t(`Sintonizas ${freq} MHz en ${band}. Antes de llamar, escuchas un rato: parece libre.`,
      `You tune to ${freq} MHz on ${band}. Before calling, you listen for a while: it seems free.`));
    await choose([
      { ok: true, text: t('¿QRL? ¿Está ocupada la frecuencia?', 'QRL? Is this frequency in use?'),
        why: t('Bien hecho: siempre se pregunta antes de llamar, por si alguien la está usando y no le oyes.', 'Well done: always ask before calling, in case someone is using it and you cannot hear them.') },
      { ok: false, text: t('¡Hola a todos! ¿Alguien me oye?', 'Hello everyone! Can anybody hear me?'),
        why: t('Así no se identifica nadie. Antes de nada, pregunta si la frecuencia está libre.', 'That does not identify anyone. First of all, ask if the frequency is free.') },
      { ok: false, text: 'Mayday, mayday, mayday…',
        why: t('¡Ojo! “Mayday” es solo para emergencias reales con vidas en peligro.', 'Careful! “Mayday” is only for real emergencies when lives are in danger.') },
    ]);
    add('info', t('Silencio. Nadie contesta: la frecuencia está libre.', 'Silence. Nobody answers: the frequency is free.'));

    await choose([
      { ok: true, text: t(`CQ CQ CQ, aquí ${say(call)}, ${call}, llamando general y a la escucha.`, `CQ CQ CQ, this is ${say(call)}, ${call}, calling CQ and listening.`),
        why: t('“CQ” es una llamada general. Deletrear tu indicativo con el alfabeto fonético evita confusiones.', '“CQ” is a general call. Spelling your callsign with the phonetic alphabet avoids mix-ups.') },
      { ok: false, text: t(`CQ, aquí ${me.name}, ¿alguien quiere hablar?`, `CQ, this is ${me.name}, does anyone want to chat?`),
        why: t('Por radio no vale el nombre: hay que dar el indicativo, y mejor deletreado.', 'On the radio your name is not enough: you must give your callsign, ideally spelt out.') },
      { ok: false, text: t('¿Hay alguien en Argentina? Llamo solo a Argentina.', 'Is anyone in Argentina? Calling Argentina only.'),
        why: t('Se puede llamar a una zona concreta (“CQ DX”), pero para empezar lo normal es una llamada general.', 'You can call a particular area (“CQ DX”), but to start with a general call is the usual thing.') },
    ]);
    await new Promise(r => setTimeout(r, 1200));
    await receive(t(`${call}, ${call}, aquí ${say(them)}. Cambio.`, `${call}, ${call}, this is ${say(them)}. Over.`));
    add('info', t(`¡Te contesta ${dx.country}! Ahora te toca dar el control de señal, tu nombre y tu QTH (dónde estás).`,
      `An answer from ${dx.country}! Now it is your turn to give a signal report, your name and your QTH (where you are).`));

    await choose([
      { ok: true, text: t(`${them}, aquí ${call}. Gracias por responder. Te recibo 5 y 9. Mi nombre es ${me.name}, ${me.name}, y mi QTH es ${me.city}. ¿Cómo me copias? ${them} de ${call}, cambio.`,
        `${them}, this is ${call}. Thanks for coming back. You are 5 and 9. My name is ${me.name}, ${me.name}, and my QTH is ${me.city}. How do you copy? ${them} de ${call}, over.`),
        why: t('“5 y 9” es el control RS: 5 de legibilidad (perfecta) y 9 de intensidad (muy fuerte).', '“5 and 9” is the RS report: 5 for readability (perfect) and 9 for strength (very strong).') },
      { ok: false, text: t('Hola, ¿quién eres? Cuéntame cosas.', 'Hi, who are you? Tell me about yourself.'),
        why: t('Primero identifícate y da los datos básicos: control de señal, nombre y QTH.', 'First identify yourself and give the basics: signal report, name and QTH.') },
      { ok: false, text: t(`${them}, te recibo 10 de 10, ¡perfecto!`, `${them}, you are 10 out of 10, perfect!`),
        why: t('El control de señal tiene su escala: legibilidad del 1 al 5 e intensidad del 1 al 9. Lo máximo es “5 y 9”.', 'Signal reports have their own scale: readability from 1 to 5 and strength from 1 to 9. The top is “5 and 9”.') },
    ]);
    await receive(t(`${call} de ${them}. Muchas gracias, ${me.name}. Te copio ${rstMe}, buena señal hasta ${dx.country}. Mi nombre es ${theirName}, ${theirName}, y estoy en ${dx.city}. Aquí son las ${theirTime}. Trabajo con 100 vatios y un dipolo. Es un placer, bienvenido a la banda. ${call} de ${them}, cambio.`,
      `${call} de ${them}. Thank you very much, ${me.name}. You are ${rstMe}, a good signal here in ${dx.country}. My name is ${theirName}, ${theirName}, and I am in ${dx.city}. The time here is ${theirTime}. I am running 100 watts into a dipole. A pleasure, welcome to the band. ${call} de ${them}, over.`));

    await choose([
      { ok: true, text: t(`Recibido, ${theirName}, todo copiado. Te confirmo el contacto con QSL. Muchas gracias por el QSO. 73. ${them} de ${call}.`,
        `Roger, ${theirName}, all copied. I will confirm the contact with a QSL. Many thanks for the QSO. 73. ${them} de ${call}.`),
        why: t('“73” son saludos cordiales. Y siempre te identificas al terminar.', '“73” means best regards. And you always identify yourself at the end.') },
      { ok: false, text: t('Vale, adiós.', 'OK, bye.'),
        why: t('Despídete bien: agradece, manda 73 y di tu indicativo al cerrar.', 'Sign off properly: say thank you, send 73 and give your callsign as you finish.') },
      { ok: false, text: t('¿Y qué te parece el gobierno? Yo creo que…', 'And what do you think of the government? I reckon…'),
        why: t('En el aire se evitan la política y la religión: es una comunidad de todo el mundo.', 'On the air we avoid politics and religion: it is a worldwide community.') },
    ]);
    await receive(t(`Recibido, ${me.name}. Te mando mi QSL. 73 y buenos DX. ${call} de ${them}, sigo a la escucha.`,
      `Roger, ${me.name}. I will send you my QSL. 73 and good DX. ${call} de ${them}, standing by.`));
    finish(t(`🎉 ¡Has completado tu primer QSO con ${dx.country}!`, `🎉 You have completed your first QSO with ${dx.country}!`), true);
  }

  /* ---------- Otros escenarios ---------- */

  /**
   * Estaciones españolas para concurso, POTA y emergencia. Campos: d = número de zona del indicativo
   * (EA1, EA2…), op = nombre del operador, city = ciudad. Para añadir una, copia un objeto { … }.
   */
  const SPAIN = [
    { d: '1', op: 'Lola', city: 'León' }, { d: '2', op: 'Íñigo', city: 'Zaragoza' }, { d: '3', op: 'Marta', city: 'Girona' },
    { d: '5', op: 'Paco', city: 'Murcia' }, { d: '7', op: 'Rocío', city: 'Sevilla' }, { d: '4', op: 'Andrés', city: 'Toledo' },
  ];
  /**
   * Crea una estación española al azar con una zona distinta de la del indicativo de la persona (para no
   * hablar consigo misma; si no hay número, vale cualquiera). Indicativo: EA + zona + 2 o 3 letras + sufijo.
   * @param {string} [suffix] Sufijo opcional, por ejemplo "/P" (portátil) en POTA.
   * @returns {object} Estación con los mismos campos que STATIONS más call.
   */
  const spaniard = suffix => { const s = pick(SPAIN.filter(x => x.d !== me.call.match(/\d/)?.[0])); return { prefix: 'EA' + s.d, call: 'EA' + s.d + letters(pick([2, 3])) + (suffix || ''), op: s.op, city: s.city, country: t('España', 'Spain'), flag: '🇪🇸', lang: 'es-ES', langEn: 'en-GB', tz: 'Europe/Madrid' }; };
  /**
   * Espera ms milisegundos.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /**
   * Escenario "concurso": contestar solo con el indicativo y dar el intercambio (control 59 y número de serie;
   * el de la persona es 001 por ser su primer contacto). El de la otra estación es un número entre 100 y 399.
   * @returns {Promise<void>}
   */
  async function runContest() {
    rst = '59';
    const call = me.call, them = dx.call, serial = 100 + Math.floor(Math.random() * 300);
    add('info', t(`Es fin de semana de concurso: la banda está llena de estaciones que intentan hacer el máximo de contactos. Oyes llamar a ${them}.`,
      `It is a contest weekend: the band is full of stations trying to make as many contacts as they can. You hear ${them} calling.`));
    await receive(t(`CQ concurso, CQ concurso, ${say(them)}.`, `CQ contest, CQ contest, ${say(them)}.`));
    await choose([
      { ok: true, text: `${call}`, why: t('En concurso se contesta solo con tu indicativo, una vez. Rápido y claro.', 'In a contest you answer with just your callsign, once. Quick and clear.') },
      { ok: false, text: t(`Hola ${them}, aquí ${call}, ¿qué tal el fin de semana? Por aquí hace buen tiempo…`, `Hello ${them}, this is ${call}, how is your weekend going? The weather is lovely here…`),
        why: t('En un concurso la otra estación quiere ir rápido: nada de charla, solo indicativo e intercambio.', 'In a contest the other station wants to be quick: no chatting, just callsign and exchange.') },
      { ok: false, text: t(`CQ concurso, aquí ${call}`, `CQ contest, this is ${call}`),
        why: t('Él está llamando; tú debes contestarle con tu indicativo, no lanzar tu propia llamada encima.', 'They are the one calling; you should answer with your callsign, not put out your own call on top.') },
    ]);
    await receive(`${call}, 5 9, ${serial}.`);
    add('info', t(`Te ha pasado el control (59) y su número de contacto (${serial}). Tú le das tu control y tu número: es tu primer contacto, así que 001.`,
      `They have given you a report (59) and their contact number (${serial}). You give your report and your number: it is your first contact, so 001.`));
    await choose([
      { ok: true, text: t(`Gracias, 5 9, 0 0 1.`, `Thanks, 5 9, 0 0 1.`), why: t('Intercambio completo: control de señal y número de serie. Con eso el contacto es válido.', 'Complete exchange: signal report and serial number. That makes the contact valid.') },
      { ok: false, text: t(`5 9, me llamo ${me.name} y estoy en ${me.city}.`, `5 9, my name is ${me.name} and I am in ${me.city}.`),
        why: t('En este concurso el intercambio es control y número de serie, no nombre y ciudad.', 'In this contest the exchange is report and serial number, not name and town.') },
      { ok: false, text: t('¿Me lo repites todo desde el principio?', 'Could you repeat everything from the start?'),
        why: t('Si no copiaste algo, pide solo lo que te falta (“¿número?”), no todo.', 'If you missed something, ask only for what you need (“number?”), not everything.') },
    ]);
    await receive(t(`Gracias, 73. QRZ concurso, ${them}.`, `Thanks, 73. QRZ contest, ${them}.`));
    finish(t('🏁 ¡Contacto de concurso hecho! Así se hacen cientos en un fin de semana.', '🏁 Contest contact done! That is how people make hundreds in a weekend.'), true);
  }

  /**
   * Escenario "pota" (Parks on the Air): contestar a una estación portátil en un parque y dar control y QTH.
   * @returns {Promise<void>}
   */
  async function runPota() {
    const call = me.call, them = dx.call;
    add('info', t(`En un mapa de actividad ves que ${them} está transmitiendo desde un parque natural cerca de ${dx.city}. Cazar parques desde casa es uno de los juegos favoritos de los radioaficionados.`,
      `On an activity map you see that ${them} is on the air from a nature park near ${dx.city}. Hunting parks from home is one of radio amateurs’ favourite games.`));
    await receive(t(`CQ POTA, CQ POTA, aquí ${say(them)}, portable desde un parque natural. Cambio.`, `CQ POTA, CQ POTA, this is ${say(them)}, portable in a nature park. Over.`));
    await choose([
      { ok: true, text: `${call}`, why: t('Los activadores de parques reciben muchas llamadas: se contesta con el indicativo y se espera turno.', 'Park activators get lots of calls: you answer with your callsign and wait your turn.') },
      { ok: false, text: t(`${them}, ${them}, ${them}, aquí ${call}, ${call}, ${call}, cambio…`, `${them}, ${them}, ${them}, this is ${call}, ${call}, ${call}, over…`),
        why: t('Repetir tanto alarga la llamada y pisa a los demás. Una o dos veces basta.', 'Repeating that much makes the call longer and covers the others. Once or twice is enough.') },
      { ok: false, text: t('¿En qué parque estás exactamente? ¿Hace frío?', 'Which park are you in exactly? Is it cold?'),
        why: t('Primero hay que hacer el contacto; las preguntas, si hay tiempo, al final.', 'First make the contact; questions at the end, if there is time.') },
    ]);
    rst = '57';
    await receive(t(`${call}, te copio 5 y 7. Te pido tu QTH, por favor.`, `${call}, you are 5 and 7. Your QTH, please.`));
    await choose([
      { ok: true, text: t(`Gracias. Te copio 5 y 9, QTH ${me.city}. ${them} de ${call}.`, `Thanks. You are 5 and 9, QTH ${me.city}. ${them} de ${call}.`),
        why: t('Control de señal y localización: lo que el activador anota en su libro de guardia.', 'Signal report and location: what the activator writes in their log.') },
      { ok: false, text: t('Te copio 5 y 9.', 'You are 5 and 9.'), why: t('Te ha pedido tu QTH: dale también tu localización.', 'They asked for your QTH: give your location too.') },
      { ok: false, text: t(`Te copio perfecto, ¿me mandas una foto del parque por WhatsApp?`, `Copy you perfectly, can you send me a photo of the park on WhatsApp?`),
        why: t('Céntrate en el intercambio que pide; después hay otros esperando.', 'Stick to the exchange they ask for; there are others waiting after you.') },
    ]);
    await receive(t(`Recibido ${me.city}. Gracias por el parque, 73. QRZ POTA, ${them}.`, `Roger ${me.city}. Thanks for the park, 73. QRZ POTA, ${them}.`));
    finish(t('🌲 ¡Has cazado tu primer parque! En POTA se llevan rankings y diplomas por parques cazados.', '🌲 You have hunted your first park! POTA keeps rankings and awards for the parks you hunt.'), true);
  }

  /**
   * Escenario "emergencia": entrar en una red dirigida de un ejercicio y dar un informe breve. No da QSL.
   * @returns {Promise<void>}
   */
  async function runEmergency() {
    const call = me.call, them = dx.call;
    add('info', t(`Hoy hay un ejercicio de emergencias. Una estación de control, ${them}, organiza la red: en estas redes se habla solo cuando el control lo pide.`,
      `Today there is an emergency exercise. A control station, ${them}, is running the net: on these nets you only speak when control asks you to.`));
    await receive(t(`Aquí ${say(them)}, estación de control del ejercicio. Estaciones que quieran entrar en la red, solo indicativo. Cambio.`,
      `This is ${say(them)}, control station for the exercise. Stations wishing to join the net, callsigns only. Over.`));
    await choose([
      { ok: true, text: `${call}`, why: t('En una red dirigida te presentas solo con el indicativo y esperas a que el control te llame.', 'On a controlled net you check in with just your callsign and wait for control to call you.') },
      { ok: false, text: t(`Hola, soy ${me.name}, estoy en ${me.city} y tengo un equipo nuevo que…`, `Hello, I am ${me.name}, I am in ${me.city} and I have a new radio that…`),
        why: t('En emergencias cada segundo cuenta: solo indicativo, el resto cuando te lo pidan.', 'In emergencies every second counts: callsign only, the rest when they ask for it.') },
      { ok: false, text: 'Mayday, mayday, mayday', why: t('Es un ejercicio: “mayday” solo se usa ante un peligro real para la vida.', 'It is an exercise: “mayday” is only used when there is a real danger to life.') },
    ]);
    await receive(t(`${call}, adelante con su informe.`, `${call}, go ahead with your report.`));
    await choose([
      { ok: true, text: t(`${call}: en ${me.city} sin novedad, sin daños. Disponible con equipo portátil y baterías. Cambio.`, `${call}: all quiet in ${me.city}, no damage. Available with portable equipment and batteries. Over.`),
        why: t('Un informe útil es corto: dónde estás, qué ves y con qué medios cuentas.', 'A useful report is short: where you are, what you see and what equipment you have.') },
      { ok: false, text: t('Bueno, pues por aquí todo bien, la verdad, aunque esta mañana se fue un rato la luz y…', 'Well, everything is fine here, really, although the power went off for a bit this morning and…'),
        why: t('Sé breve y concreto: situación, daños y medios disponibles.', 'Be short and to the point: situation, damage and equipment available.') },
      { ok: false, text: t('Pásame con el 112, por favor.', 'Put me through to 112, please.'),
        why: t('La red de radio apoya a los servicios de emergencia, pero no es una centralita: da tu informe al control.', 'The radio net supports the emergency services, but it is not a switchboard: give your report to control.') },
    ]);
    await receive(t(`Recibido ${call}, anotado. Quede a la escucha en esta frecuencia. Control.`, `Roger ${call}, logged. Please stand by on this frequency. Control.`));
    finish(t('🚨 Ejercicio completado. Así funcionan las redes de emergencia: disciplina, mensajes cortos y la estación de control al mando.',
      '🚨 Exercise complete. This is how emergency nets work: discipline, short messages and the control station in charge.'), false);
  }

  /**
   * Escenario "iss": contacto rapidísimo con la Estación Espacial (solo indicativos y control).
   * @returns {Promise<void>}
   */
  async function runIss() {
    rst = '59';
    const call = me.call, them = dx.call;
    add('info', t('La Estación Espacial Internacional pasa sobre España. Solo la tendrás a la vista unos 10 minutos y mucha gente intenta contactar a la vez: hay que ser rapidísimo.',
      'The International Space Station is passing over you. It will only be in view for about 10 minutes and lots of people are trying to make contact at once: you have to be very quick.'));
    await wait(800);
    await receive(t(`${say(them)}, escuchando. Adelante.`, `${say(them)}, listening. Go ahead.`));
    await choose([
      { ok: true, text: t(`${them}, aquí ${call}.`, `${them}, this is ${call}.`), why: t('Con decenas de estaciones llamando, solo el indicativo de la ISS y el tuyo. Nada más.', 'With dozens of stations calling, just the ISS callsign and yours. Nothing else.') },
      { ok: false, text: t(`Hola ${them}, ¿qué tal por el espacio? Aquí ${me.name}, desde ${me.city}, te quería preguntar…`, `Hello ${them}, how is space? This is ${me.name}, in ${me.city}, I wanted to ask you…`),
        why: t('El pase dura minutos: si te alargas, nadie más podrá hacer su contacto.', 'The pass only lasts minutes: if you go on, nobody else will get their contact.') },
      { ok: false, text: 'CQ CQ CQ', why: t('No se llama CQ a la ISS: se contesta a su llamada con los dos indicativos.', 'You do not call CQ to the ISS: you answer its call with both callsigns.') },
    ]);
    await receive(t(`${call}, 5 9. Gracias. Siguiente.`, `${call}, 5 9. Thank you. Next.`));
    await choose([
      { ok: true, text: t('5 9, gracias, 73.', '5 9, thanks, 73.'), why: t('Corto y con cortesía: control de señal y despedida. ¡Contacto con el espacio hecho!', 'Short and polite: signal report and goodbye. Contact with space done!') },
      { ok: false, text: t('¿Puedes repetir? ¿Y me saludas a la tripulación?', 'Can you say again? And say hello to the crew for me?'),
        why: t('La ISS ya ha pasado a la siguiente estación: lo justo y a tiempo.', 'The ISS has already moved on to the next station: just what is needed, and in time.') },
      { ok: false, text: t('(No digo nada)', '(I say nothing)'), why: t('Hay que confirmar el contacto con tu control de señal para que sea válido.', 'You need to confirm the contact with your signal report for it to be valid.') },
    ]);
    finish(t('🛰️ ¡Contacto con la Estación Espacial! Algunos radioaficionados lo consiguen con un walkie y una antena de mano.',
      '🛰️ Contact with the Space Station! Some radio amateurs manage it with a handheld radio and a hand-held antenna.'), true);
  }

  /* ---------- Final del contacto ---------- */

  /**
   * Cierra el contacto: hito de métricas, silencia el ruido, escribe el mensaje final y emite `radio:qso`.
   * Con QSL, muestra la tarjeta a los 0,9 s; sin ella, pone un botón "Otro contacto" que equivale a #qsoAgain.
   * @param {string} text Mensaje final para la conversación (HTML propio, no se escapa).
   * @param {boolean} qsl true si el escenario da tarjeta QSL.
   * @returns {void}
   */
  function finish(text, qsl) {
    Radio.track(`qso/${scenario}`);
    stopNoise();
    $('qsoOnAir').textContent = qsl ? t('QSO COMPLETO', 'QSO COMPLETE') : t('EJERCICIO HECHO', 'EXERCISE DONE');
    add('info', text + (qsl ? t(' Te ha llegado su tarjeta QSL.', ' Their QSL card has arrived.') : ''));
    document.dispatchEvent(new CustomEvent('radio:qso', { detail: { scenario } }));
    if (qsl) setTimeout(showQsl, 900);
    else {
      const b = document.createElement('button');
      b.className = 'btn ghost small'; b.textContent = t('Otro contacto', 'Another contact');
      b.onclick = () => $('qsoAgain').click();
      $('qsoChoices').innerHTML = ''; $('qsoChoices').appendChild(b);
    }
  }

  /* ---------- Tarjeta QSL ---------- */
  /**
   * Dibuja la tarjeta QSL en #qslCanvas y la muestra.
   * Espera a que carguen las fuentes de la web (si no, el lienzo usaría las del sistema). Fecha y hora en
   * UTC, como se hace en radio. Los colores van escritos aquí (no variables CSS) para que la tarjeta salga
   * igual con tema claro u oscuro.
   * Coordenadas en píxeles del lienzo (900 × 560), con el origen arriba a la izquierda y la y hacia abajo:
   *  - fondo y círculos concéntricos decorativos centrados en (W − 90, 90), radio de 60 a 700 cada 46 px;
   *  - marco a 18 px del borde;
   *  - textos con margen izquierdo de 52 px: país y ciudad (y 76), indicativo grande (y 180),
   *    operador (y 222), "Para: …" (y 290), "Confirmando…" (y 326);
   *  - tabla de datos desde (52, 352), 92 px de alto, a todo el ancho menos 52 px por cada lado;
   *  - "Tnx QSO · 73!" a la izquierda y la firma a la derecha, ambos en y 506.
   * fillText usa la y como línea base del texto, no como su borde superior.
   * @returns {Promise<void>}
   */
  async function showQsl() {
    if (document.fonts) await document.fonts.ready;
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 16);
    const c = $('qslCanvas'), g = c.getContext('2d');
    const W = c.width, H = c.height;
    const ink = '#eaf0f7', mint = '#f2b33d', muted = '#9db0c7';

    g.fillStyle = '#0d1828'; g.fillRect(0, 0, W, H);
    // ondas decorativas
    g.strokeStyle = 'rgba(139,224,194,.12)'; g.lineWidth = 2;
    for (let r = 60; r < 700; r += 46) { g.beginPath(); g.arc(W - 90, 90, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = mint; g.lineWidth = 3; g.strokeRect(18, 18, W - 36, H - 36);

    g.fillStyle = mint; g.font = '600 18px "IBM Plex Mono", monospace';
    g.fillText(`${dx.country.toUpperCase()} · ${dx.city.toUpperCase()}`, 52, 76);
    g.fillStyle = ink; g.font = '800 112px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.fillText(dx.call, 46, 180);
    g.font = '400 24px "Atkinson Hyperlegible", sans-serif'; g.fillStyle = muted;
    g.fillText(`${t('Operador', 'Operator')}: ${dx.op}`, 52, 222);

    g.fillStyle = ink; g.font = '600 26px "Atkinson Hyperlegible", sans-serif';
    g.fillText(`${t('Para', 'To')}: ${me.call} · ${me.name} (${me.city})`, 52, 290);
    g.fillStyle = muted; g.font = '400 20px "Atkinson Hyperlegible", sans-serif';
    g.fillText(t('Confirmando nuestro QSO:', 'Confirming our QSO:'), 52, 326);

    // Tabla de seis casillas [título, valor]. `weights` reparte el ancho: FECHA es la más ancha y RST la más
    // estrecha. unit = píxeles por unidad de peso.
    const cols = [[t('FECHA', 'DATE'), date], ['UTC', time], [t('BANDA', 'BAND'), band], ['MHz', freq], [t('MODO', 'MODE'), mode], ['RST', rst]];
    const x0 = 52, y0 = 352, weights = [1.7, 1, 1, 1.15, 0.95, 0.8];
    const unit = (W - 104) / weights.reduce((a, b) => a + b, 0);
    g.strokeStyle = '#34507a'; g.lineWidth = 1.5;
    let x = x0;
    cols.forEach(([k, v], i) => {
      const cw = weights[i] * unit;
      g.strokeRect(x, y0, cw, 92);
      g.fillStyle = muted; g.font = '600 14px "IBM Plex Mono", monospace'; g.fillText(k, x + 14, y0 + 28);
      g.fillStyle = ink; g.font = '600 22px "IBM Plex Mono", monospace'; g.fillText(v, x + 14, y0 + 68);
      x += cw;
    });

    g.fillStyle = mint; g.font = '800 44px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.fillText('Tnx QSO · 73!', 52, 506);
    g.fillStyle = muted; g.font = '400 15px "IBM Plex Mono", monospace';
    g.textAlign = 'right'; g.fillText(t('Contacto simulado · radio.bendi.dev', 'Simulated contact · radio.bendi.dev/en'), W - 52, 506); g.textAlign = 'left';

    $('qsoQsl').hidden = false;
    $('qsoQsl').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Compartir y descargar la QSL ---------- */
  // Compartir la QSL como imagen (móvil) si el navegador lo permite
  // Se comprueba con un archivo PNG vacío de prueba si el navegador acepta compartir archivos; si sí,
  // aparece el botón Compartir y Descargar pasa a ser secundario (clase "ghost").
  const canShareFiles = !!(navigator.canShare && window.File &&
    navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  if (canShareFiles) {
    $('qslShare').hidden = false;
    $('qslDownload').classList.add('ghost');
  }
  // Compartir: convierte el lienzo en un archivo PNG y abre el panel de compartir del sistema.
  // Si la persona lo cierra sin compartir, navigator.share lanza un error que se ignora.
  $('qslShare').addEventListener('click', () => {
    $('qslCanvas').toBlob(async blob => {
      const file = new File([blob], `QSL_${dx.call}_${me.call}.png`, { type: 'image/png' });
      try {
        await navigator.share({ files: [file], title: t('Mi primer QSO', 'My first QSO'),
          text: t(`¡He hecho mi primer contacto por radio con ${dx.country}! 📻 73. Pruébalo en https://radio.bendi.dev/`,
            `I have made my first radio contact with ${dx.country}! 📻 73. Try it at https://radio.bendi.dev/en/`) });
      } catch (e) { /* cancelado */ }
    }, 'image/png');
  });

  // Descargar: un enlace temporal con el PNG en una URL data: y el atributo download, pulsado por código.
  $('qslDownload').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `QSL_${dx.call}_${me.call}.png`;
    Radio.track('qsl/descargada');
    a.href = $('qslCanvas').toDataURL('image/png');
    a.click();
  });

  /* ---------- Inicio ---------- */
  /* ---------- Inicio ---------- */
  /**
   * Envío del formulario: valida el indicativo, prepara la otra estación, la banda y la frecuencia, muestra
   * el panel de radio, arranca el ruido y lanza el guion del escenario elegido.
   * Indicativo válido: de 3 a 8 letras o cifras (se quitan los demás caracteres) y al menos una cifra; si no,
   * se muestra el aviso nativo del navegador (setCustomValidity + reportValidity).
   * @param {SubmitEvent} e Evento submit (se cancela para que no recargue la página).
   * @returns {void}
   */
  function start(e) {
    e.preventDefault();
    const callIn = $('qsoCall').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,8}$/.test(callIn) || !/\d/.test(callIn)) {
      $('qsoCall').setCustomValidity(t('Un indicativo lleva letras y al menos un número, por ejemplo EA4ABC.', 'A callsign has letters and at least one number, for example EA4ABC.'));
      $('qsoCall').reportValidity();
      return;
    }
    me = { name: $('qsoName').value.trim(), city: $('qsoCity').value.trim(), call: callIn };
    scenario = $('qsoScenario').value;
    // Banda por la hora UTC: de día 20 m (USB, como se usa por encima de 10 MHz), de noche 40 m (LSB).
    // La frecuencia es al azar dentro del segmento de voz, con 3 decimales (kHz).
    const h = new Date().getUTCHours();
    const day = h >= 8 && h < 18;
    band = day ? '20 m' : '40 m';
    mode = day ? 'USB' : 'LSB';
    freq = (day ? 14.150 + Math.random() * 0.14 : 7.090 + Math.random() * 0.09).toFixed(3);
    // Otra estación y, si hace falta, banda, modo y frecuencia propios de cada escenario.
    // 145.425 MHz es una frecuencia símplex de FM en 2 m; 145.800 MHz, la de voz de la ISS.
    if (scenario === 'primero') { const st = pick(STATIONS); dx = { ...st, call: st.prefix + letters(pick([2, 3])) }; }
    if (scenario === 'concurso') { dx = spaniard(); band = '40 m'; mode = 'LSB'; freq = (7.060 + Math.random() * 0.13).toFixed(3); }
    if (scenario === 'pota') { dx = spaniard('/P'); }
    if (scenario === 'emergencia') { dx = spaniard(); band = '2 m'; mode = 'FM'; freq = '145.425'; }
    if (scenario === 'iss') { dx = { call: 'NA1SS', op: t('Tripulación de la ISS', 'ISS crew'), city: t('a 400 km de altura', '400 km up'), country: t('Estación Espacial', 'the Space Station'), flag: '🛰️', lang: 'es-ES', langEn: 'en-US', tz: 'UTC' }; band = '2 m'; mode = 'FM'; freq = '145.800'; }
    log = [];
    $('qsoLog').innerHTML = '';
    $('qsoFreq').textContent = `${freq} MHz · ${mode}`;
    $('qsoOnAir').textContent = t('EN EL AIRE', 'ON AIR');
    $('qsoSetup').hidden = true;
    $('qsoQsl').hidden = true;
    $('qsoRadio').hidden = false;
    startNoise(); noise(0.012);
    // Lanza el guion: este objeto relaciona el valor del <select> con su función. Añade aquí los escenarios nuevos.
    ({ primero: run, concurso: runContest, pota: runPota, emergencia: runEmergency, iss: runIss })[scenario]();
  }

  // Al escribir el indicativo: borra el aviso de error anterior y lo pasa a mayúsculas.
  $('qsoCall').addEventListener('input', () => {
    $('qsoCall').setCustomValidity('');
    const v = $('qsoCall').value.toUpperCase();
    if (v !== $('qsoCall').value) $('qsoCall').value = v;
  });
  $('qsoSetup').addEventListener('submit', start);
  // "Otro contacto": corta voz y ruido y vuelve al formulario.
  $('qsoAgain').addEventListener('click', () => {
    stopNoise(); if ('speechSynthesis' in window) speechSynthesis.cancel();
    $('qsoRadio').hidden = true; $('qsoQsl').hidden = true; $('qsoSetup').hidden = false;
    $('qsoSetup').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  // Algunos navegadores (Chrome) cargan la lista de voces tarde: pedirla ya hace que esté lista en el primer contacto.
  if ('speechSynthesis' in window) speechSynthesis.getVoices(); // precarga de voces
})();
