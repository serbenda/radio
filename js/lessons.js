/**
 * lessons.js · "Cómo funciona la radio": cuatro lecciones interactivas con dibujo, tres niveles y test.
 *
 * Página: Entender (/entender/, sección #como-funciona; si no existe, el módulo no hace nada).
 * Elementos que necesita (entender/index.html):
 *  - #lessonTabs    Contenedor de las pestañas de lección (se generan aquí, una por entrada de LESSONS).
 *  - #lessonStage   Zona del dibujo interactivo; cada lección la rellena con su función de STAGES.
 *  - #lessonLevels  Grupo de tres botones fijos en el HTML con data-l="0|1|2" (Curioso, Interesado, Técnico).
 *  - #lessonText    Texto del nivel elegido.
 *  - #lessonQuiz    Las 3 preguntas de la lección y el resultado.
 *
 * Depende de: core.js (Radio.whileVisible, Radio.reducedMotion, Radio.track). Lee variables CSS del tema
 *   (--line, --accent, --hot) para que los lienzos usen los mismos colores que la página, en claro y oscuro.
 *
 * Lecciones (datos en LESSONS, dibujo en STAGES, con el mismo `id`):
 *  - onda       canvas animado de una onda; deslizador de frecuencia → longitud de onda (λ ≈ 300 / f).
 *  - antena     SVG de un dipolo a escala para 5 bandas, con una persona de 1,75 m como referencia.
 *  - ionosfera  SVG con capas D y F: frecuencia, día/noche y Sol activo deciden si la onda rebota.
 *  - modos      canvas animado de AM, FM, CW y BLU (SSB).
 * El nivel de explicación elegido se mantiene al cambiar de lección.
 *
 * Guarda en localStorage, clave "radio.lessons": { idLección: true } para cada lección con las 3 preguntas
 *   acertadas, por ejemplo { "onda": true, "modos": true }. Nunca se borra una lección ya completada.
 * Eventos: emite `radio:progress` (sin detalle) al completar una lección, para que journey.js recalcule.
 *   Hito de métricas (con Radio.track): 'leccion/<id>'.
 * No usa servicios externos.
 * Rendimiento: los lienzos solo se animan mientras se ven y la pestaña está activa (animate() →
 *   Radio.whileVisible); con "reducir movimiento" se dibujan una sola vez y se redibujan al cambiar un control.
 *   Al cambiar de lección se para la animación anterior.
 * Accesibilidad: los dibujos son aria-hidden; lo que muestran se dice en texto en .lesson-readout (aria-live),
 *   así que un lector de pantalla oye el resultado al mover los controles. Pestañas y niveles usan aria-pressed.
 *
 * Textos visibles: en castellano e inglés con Radio.t(es, en) (ver docs/IDIOMAS.md).
 *
 * Cómo modificarlo:
 *  - Cambiar textos o preguntas: en LESSONS (campos explicados encima). Los textos de niveles admiten HTML.
 *  - Añadir una lección: una entrada nueva en LESSONS con un `id` único y una función con ese mismo nombre en
 *    STAGES (ver el contrato encima de STAGES). Sin función en STAGES la pestaña daría error al abrirse.
 *  - Cambiar el número de preguntas: renderQuiz() da por hecho que son 3 (`hits === 3` y "de 3").
 *  - Cambiar las bandas de los dibujos: las listas `bands` (antena) y `freqs` (ionosfera) de STAGES.
 */
(() => {
  'use strict';
  if (!document.getElementById('como-funciona')) return; // esta página no tiene la sección
  /* ---------- Utilidades locales ---------- */
  const $ = id => document.getElementById(id);
  const { t } = Radio;
  /**
   * Escapa texto para meterlo en HTML (& < > " '). Se usa con las preguntas y respuestas del test.
   * @param {*} s Valor a escapar (se convierte a texto).
   * @returns {string}
   */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /**
   * Acceso a localStorage con JSON y sin excepciones (en modo privado o con la cuota llena puede fallar).
   * get(k) devuelve el valor guardado o null; set(k, v) guarda v como JSON (si falla, no hace nada).
   */
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  /**
   * Lee el valor de una variable CSS de la página (por ejemplo css('--accent') → "#f2b33d").
   * Así los lienzos usan los colores del tema actual. Se lee en cada fotograma, por si cambia el tema.
   * @param {string} v Nombre de la variable, con los dos guiones.
   * @returns {string}
   */
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ---------- Contenido de las lecciones ---------- */

  /**
   * Lista de lecciones, en el orden de las pestañas. Campos de cada una:
   *  - id      Identificador único y corto (sin espacios). Debe existir una función con el mismo nombre
   *            en STAGES. También es la clave en "radio.lessons" y el hito 'leccion/<id>': no lo cambies en
   *            una lección ya publicada o la gente perderá su marca de completada.
   *  - title   Nombre de la pestaña.  · icon  Emoji delante del título.
   *  - levels  Tres textos, en este orden: [curioso, interesado, técnico]. Admiten HTML (<b>…); son
   *            contenido propio y se insertan sin escapar.
   *  - quiz    Tres preguntas { q: pregunta, a: [respuestas], ok: posición de la correcta empezando en 0 }.
   *            Texto plano (se escapa al pintarlo).
   * Para añadir una lección, copia un bloque { … } entero, cambia sus campos y crea su función en STAGES.
   */
  const LESSONS = [
    {
      id: 'onda', title: t('La onda', 'The wave'), icon: '〰️',
      levels: [
        t('La radio viaja como las olas en un estanque, pero invisibles y a la velocidad de la luz. Cuantas más olas por segundo, más “aguda” es la onda y más cortas son.',
          'Radio travels like ripples on a pond, but invisible and at the speed of light. The more ripples per second, the “higher” the wave and the shorter they are.'),
        t('El número de olas por segundo es la <b>frecuencia</b> (en megahercios, MHz). La distancia entre dos crestas es la <b>longitud de onda</b>. Por eso las bandas se llaman “40 metros” o “2 metros”: es el tamaño de su onda.',
          'The number of ripples per second is the <b>frequency</b> (in megahertz, MHz). The distance between two crests is the <b>wavelength</b>. That is why bands are called “40 metres” or “2 metres”: it is the size of their wave.'),
        t('Longitud de onda (m) ≈ 300 / frecuencia (MHz). A 7 MHz: 300 / 7 ≈ 43 m. Las frecuencias bajas rodean obstáculos y rebotan en la ionosfera; las altas viajan en línea recta, como la luz.',
          'Wavelength (m) ≈ 300 / frequency (MHz). At 7 MHz: 300 / 7 ≈ 43 m. Low frequencies bend around obstacles and bounce off the ionosphere; high ones travel in a straight line, like light.'),
      ],
      quiz: [
        { q: t('¿Qué mide la frecuencia?', 'What does frequency measure?'), a: [t('Cuántas ondas pasan por segundo', 'How many waves pass each second'), t('Lo fuerte que es la señal', 'How strong the signal is'), t('La distancia a la emisora', 'The distance to the station')], ok: 0 },
        { q: t('Si la frecuencia sube, la longitud de onda…', 'If the frequency goes up, the wavelength…'), a: [t('También sube', 'Goes up too'), t('Baja', 'Goes down'), t('No cambia', 'Does not change')], ok: 1 },
        { q: t('¿Por qué la banda de 7 MHz se llama “40 metros”?', 'Why is the 7 MHz band called “40 metres”?'), a: [t('Porque llega a 40 km', 'Because it reaches 40 km'), t('Porque su onda mide unos 40 m', 'Because its wave is about 40 m long'), t('Porque usa antenas de 40 m de alto', 'Because it uses 40 m tall antennas')], ok: 1 },
      ],
    },
    {
      id: 'antena', title: t('La antena', 'The antenna'), icon: '📡',
      levels: [
        t('Una antena es un cable que “lanza” y “atrapa” ondas. Funciona mejor cuando su tamaño encaja con la onda, como una cuerda de guitarra con su nota.',
          'An antenna is a wire that “throws” and “catches” waves. It works best when its size matches the wave, like a guitar string and its note.'),
        t('La antena más sencilla es el <b>dipolo</b>: dos cables iguales en línea, alimentados por el centro. En total mide la mitad de la longitud de onda. Para 40 m, unos 20 metros de punta a punta.',
          'The simplest antenna is the <b>dipole</b>: two equal wires in a line, fed in the centre. In total it is half a wavelength long. For 40 m, about 20 metres from end to end.'),
        t('Largo del dipolo (m) ≈ 143 / f (MHz), algo menos que λ/2 por el efecto de los extremos. En el centro presenta unos 50-75 Ω, lo que encaja con el cable coaxial. Por eso las bandas altas permiten antenas pequeñas y direccionales.',
          'Dipole length (m) ≈ 143 / f (MHz), a little less than λ/2 because of the end effect. At the centre it shows about 50-75 Ω, which matches coaxial cable. That is why the high bands allow small, directional antennas.'),
      ],
      quiz: [
        { q: t('¿Cuánto mide, en total, un dipolo?', 'How long is a dipole in total?'), a: [t('Media longitud de onda', 'Half a wavelength'), t('Una longitud de onda entera', 'A whole wavelength'), t('Siempre 1 metro', 'Always 1 metre')], ok: 0 },
        { q: t('¿Para qué banda es más pequeña la antena?', 'For which band is the antenna smallest?'), a: ['80 m', '40 m', '2 m'], ok: 2 },
        { q: t('¿Por dónde se conecta el cable a un dipolo?', 'Where is the cable connected to a dipole?'), a: [t('Por un extremo', 'At one end'), t('Por el centro', 'In the centre'), t('Por los dos extremos', 'At both ends')], ok: 1 },
      ],
    },
    {
      id: 'ionosfera', title: t('La ionosfera', 'The ionosphere'), icon: '🌍',
      levels: [
        t('Muy arriba, el Sol carga el aire de electricidad. Esa capa, la <b>ionosfera</b>, hace de espejo para algunas ondas: rebotan y caen a miles de kilómetros.',
          'High up, the Sun charges the air with electricity. That layer, the <b>ionosphere</b>, acts as a mirror for some waves: they bounce and come down thousands of kilometres away.'),
        t('De día aparece una capa baja (la D) que se “come” las frecuencias bajas; de noche desaparece y las bandas bajas llegan lejos. Las frecuencias altas solo rebotan si el Sol está activo; si no, se escapan al espacio.',
          'By day a low layer (the D layer) appears and “eats” the low frequencies; at night it disappears and the low bands reach far. High frequencies only bounce if the Sun is active; if not, they escape into space.'),
        t('La reflexión depende de la frecuencia crítica de la capa F y del ángulo. La máxima frecuencia utilizable (MUF) sube de día y con el flujo solar. Por encima de la MUF la onda atraviesa la ionosfera; la capa D absorbe más cuanto más baja es la frecuencia.',
          'Reflection depends on the critical frequency of the F layer and on the angle. The maximum usable frequency (MUF) rises by day and with the solar flux. Above the MUF the wave goes through the ionosphere; the D layer absorbs more the lower the frequency.'),
      ],
      quiz: [
        { q: t('¿Qué hace la capa D durante el día?', 'What does the D layer do during the day?'), a: [t('Refleja todo', 'Reflects everything'), t('Absorbe las frecuencias bajas', 'Absorbs the low frequencies'), t('Desaparece', 'Disappears')], ok: 1 },
        { q: t('Si una onda va por encima de la MUF…', 'If a wave is above the MUF…'), a: [t('Rebota más lejos', 'It bounces further'), t('Se escapa al espacio', 'It escapes into space'), t('Se oye más fuerte', 'It sounds louder')], ok: 1 },
        { q: t('¿Cuándo suelen funcionar mejor 80 y 40 m?', 'When do 80 and 40 m usually work best?'), a: [t('De noche', 'At night'), t('A mediodía', 'At midday'), t('Nunca', 'Never')], ok: 0 },
      ],
    },
    {
      id: 'modos', title: t('Cómo viaja tu voz', 'How your voice travels'), icon: '🎙️',
      levels: [
        t('La onda de radio es como un camión vacío: para que lleve tu voz hay que “cargarla”. Hay varias formas de hacerlo y cada una suena distinta.',
          'A radio wave is like an empty lorry: to carry your voice it has to be “loaded”. There are several ways to do it and each one sounds different.'),
        t('En <b>AM</b> cambia la fuerza de la onda; en <b>FM</b>, su frecuencia (la de los walkies). En <b>CW</b> se enciende y apaga para hacer Morse. La <b>BLU</b> (SSB), la favorita en onda corta, solo envía la parte útil de la voz y llega más lejos con la misma potencia.',
          'In <b>AM</b> the strength of the wave changes; in <b>FM</b>, its frequency (the one walkie-talkies use). In <b>CW</b> it is switched on and off to send Morse. <b>SSB</b> (single sideband), the favourite on short wave, only sends the useful part of the voice and reaches further with the same power.'),
        t('AM gasta dos tercios de la potencia en la portadora. SSB suprime la portadora y una banda lateral: ocupa unos 2,7 kHz y concentra la energía. FM es inmune a parte del ruido pero necesita más ancho de banda. CW cabe en menos de 200 Hz: máxima eficiencia.',
          'AM spends two thirds of its power on the carrier. SSB removes the carrier and one sideband: it takes up about 2.7 kHz and concentrates the energy. FM ignores some of the noise but needs more bandwidth. CW fits in less than 200 Hz: maximum efficiency.'),
      ],
      quiz: [
        { q: t('¿Qué cambia en FM?', 'What changes in FM?'), a: [t('La fuerza de la onda', 'The strength of the wave'), t('La frecuencia de la onda', 'The frequency of the wave'), t('Nada', 'Nothing')], ok: 1 },
        { q: t('¿Qué modo de voz se usa más en onda corta?', 'Which voice mode is used most on short wave?'), a: ['FM', t('BLU (SSB)', 'SSB'), t('Televisión', 'Television')], ok: 1 },
        { q: t('¿Cuál ocupa menos espacio en el dial?', 'Which one takes up the least space on the dial?'), a: [t('CW (Morse)', 'CW (Morse)'), 'AM', 'FM'], ok: 0 },
      ],
    },
  ];

  // Estado: lección abierta, nivel de explicación (0-2), función para parar la animación actual
  // y lecciones completadas (cargadas de "radio.lessons").
  let current = LESSONS[0], level = 0, stopAnim = null;
  const done = store.get('radio.lessons') || {};

  /* ---------- Dibujos interactivos ---------- */
  /**
   * Ajusta la resolución interna de un <canvas> a su tamaño en pantalla y a la densidad de píxeles
   * (devicePixelRatio, 2 o 3 en móviles), para que no se vea borroso. Después escala el contexto para
   * que se pueda dibujar en píxeles CSS. Se llama en cada fotograma, así se adapta si cambia el tamaño.
   * @param {HTMLCanvasElement} c Lienzo.
   * @returns {{g: CanvasRenderingContext2D, w: number, h: number}} Contexto y tamaño en píxeles CSS.
   */
  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    c.width = r.width * d; c.height = r.height * d;
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    return { g, w: r.width, h: r.height };
  }

  /**
   * Conecta una animación a la visibilidad del lienzo: `start` cuando se ve y la pestaña está activa,
   * `stop` cuando deja de verse. Con "reducir movimiento" no anima nunca.
   * @param {Element} el Elemento a vigilar (el lienzo).
   * @param {Function} start Arranca el bucle de animación.
   * @param {Function} stop Lo para.
   * @returns {Function} Función que deja de vigilar y para la animación (show() la llama al cambiar de lección).
   */
  function animate(el, start, stop) {
    if (Radio.reducedMotion) return () => {};
    const unwatch = Radio.whileVisible(el, start, stop);
    return () => { unwatch(); stop(); };
  }

  /**
   * Dibujos interactivos, uno por lección, con el mismo nombre que el `id` de LESSONS.
   * Contrato de cada función:
   *  - Recibe `box` (#lessonStage) y escribe dentro su HTML: el dibujo, sus controles y un
   *    <p class="lesson-readout" aria-live="polite"> que cuenta en texto lo que se ve.
   *  - Devuelve una función para parar su animación (la de animate()) o null si no anima.
   * Los id internos (lwF, laSvg, liOut…) llevan un prefijo por lección para no chocar con el resto de la página.
   */
  const STAGES = {
    /**
     * Lección "La onda": onda senoidal animada y deslizador de frecuencia (1,8 a 450 MHz).
     * Muestra la longitud de onda λ = 300 / f (λ en metros, f en MHz; 300 ≈ velocidad de la luz en
     * millones de m/s) y la compara con un objeto cotidiano.
     * @param {HTMLElement} box Contenedor del dibujo.
     * @returns {Function} Parar la animación.
     */
    onda(box) {
      box.innerHTML = `<canvas class="lesson-canvas" aria-hidden="true"></canvas>
        <label class="inline">${t('Frecuencia', 'Frequency')} <input type="range" id="lwF" min="0" max="1000" value="400"> <b id="lwFv"></b></label>
        <p class="lesson-readout" id="lwOut" aria-live="polite"></p>`;
      const c = box.querySelector('canvas'); let ph = 0, run = false;
      // El deslizador va de 0 a 1000 y se convierte en frecuencia con escala logarítmica entre 1,8 y 450 MHz:
      // f = 1,8 · (450/1,8)^(valor/1000). Así 160 m y 70 cm caben en el mismo recorrido con la misma precisión.
      const freq = () => 1.8 * Math.pow(450 / 1.8, $('lwF').value / 1000);
      // Comparación de la longitud de onda (en metros) con algo conocido.
      const compare = l => l > 100 ? t('más que un campo de fútbol', 'more than a football pitch') : l > 30 ? t('como un edificio de 10 plantas', 'like a 10-storey building') : l > 8 ? t('como un autobús', 'like a bus') : l > 1.5 ? t('como una persona', 'like a person') : l > 0.3 ? t('como un plato', 'like a plate') : t('como un móvil', 'like a mobile phone');
      /**
       * Dibuja un fotograma y actualiza los textos. Si la animación está en marcha, pide el siguiente.
       * `ph` desplaza la fase en cada fotograma para que la onda avance.
       */
      function frame() {
        const { g, w, h } = sizeCanvas(c), f = freq(), lam = 300 / f;
        // Número de ondas que se ven: de 1 (a 1,8 MHz) a 12 (a 450 MHz), también en escala logarítmica.
        // No es a escala real; solo transmite que a más frecuencia, ondas más apretadas.
        const cycles = 1 + Math.log(f / 1.8) / Math.log(450 / 1.8) * 11;
        g.clearRect(0, 0, w, h);
        g.strokeStyle = css('--line'); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        g.strokeStyle = css('--accent'); g.lineWidth = 2.5; g.beginPath();
        for (let x = 0; x <= w; x += 2) { const y = h / 2 - Math.sin((x / w) * cycles * 2 * Math.PI - ph) * (h * 0.36); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); ph += 0.06;
        $('lwFv').textContent = f < 10 ? f.toFixed(2) + ' MHz' : f.toFixed(0) + ' MHz';
        $('lwOut').innerHTML = `${t('Longitud de onda', 'Wavelength')}: <b>${lam >= 10 ? lam.toFixed(0) : lam.toFixed(2)} m</b>, ${compare(lam)}.`;
        if (run && !Radio.reducedMotion) requestAnimationFrame(frame);
      }
      // Con la animación parada (fuera de pantalla o con movimiento reducido), se redibuja al mover el control.
      $('lwF').addEventListener('input', () => { if (!run) frame(); });
      frame(); // primer dibujo, aunque no se anime
      return animate(c, () => { if (!run) { run = true; frame(); } }, () => { run = false; });
    },
    /**
     * Lección "La antena": dipolo de media onda dibujado a escala junto a una persona de 1,75 m.
     * Largo del dipolo L (m) ≈ 143 / f (MHz): algo menos que λ/2 (150 / f) por el efecto de los extremos.
     * @param {HTMLElement} box Contenedor del dibujo.
     * @returns {null} No anima.
     */
    antena(box) {
      // Bandas que se pueden elegir: [nombre, frecuencia representativa en MHz].
      const bands = [['80 m', 3.65], ['40 m', 7.1], ['20 m', 14.2], ['10 m', 28.5], ['2 m', 145]];
      box.innerHTML = `<svg class="lesson-svg" viewBox="0 0 600 220" id="laSvg" aria-hidden="true"></svg>
        <div class="chips" id="laBands">${bands.map((b, i) => `<button class="chip${i === 1 ? ' on' : ''}" data-i="${i}">${b[0]}</button>`).join('')}</div>
        <p class="lesson-readout" id="laOut" aria-live="polite"></p>`;
      /**
       * Dibuja el dipolo de la banda i y su texto explicativo.
       * Coordenadas del SVG (viewBox 600 × 220): centro del dipolo en x = 300, cable a la altura y = 70,
       * suelo en y = 200. La escala (px por metro) hace que el dipolo ocupe 520 px como mucho y nunca pase de
       * 260 px por metro, para que en 2 m la persona no salga gigante; si aun así mediría 200 px o más, no se dibuja.
       * @param {number} i Posición en `bands`.
       */
      function draw(i) {
        const [name, f] = bands[i], len = 143 / f;
        const scale = Math.min(520 / len, 260); // px por metro, con tope para que la persona no sea gigante
        const half = (len * scale) / 2, cx = 300, y = 70;
        // Altura de la persona en px: 1,75 m a la misma escala que el dipolo.
        const person = 1.75 * scale;
        $('laSvg').innerHTML = `
          <line x1="${cx - half}" y1="${y}" x2="${cx - 6}" y2="${y}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
          <line x1="${cx + 6}" y1="${y}" x2="${cx + half}" y2="${y}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
          <rect x="${cx - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="var(--hot)"/>
          <path d="M${cx} ${y + 6} V200" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>
          <text x="${cx + 8}" y="150" fill="var(--muted)" font-size="12">${t('cable coaxial', 'coaxial cable')}</text>
          <text x="${cx}" y="${y - 16}" fill="var(--ink)" font-size="14" text-anchor="middle">${len >= 10 ? len.toFixed(1) : len.toFixed(2)} m</text>
          ${person < 200 ? `<g transform="translate(${cx + 120},${200 - person})" fill="var(--muted)"><circle cx="0" cy="${person * 0.08}" r="${person * 0.08}"/><rect x="${-person * 0.07}" y="${person * 0.17}" width="${person * 0.14}" height="${person * 0.83}" rx="${person * 0.05}"/></g>
          <text x="${cx + 120}" y="215" fill="var(--muted)" font-size="11" text-anchor="middle">${t('persona (1,75 m)', 'person (1.75 m)')}</text>` : ''}
          <line x1="0" y1="200" x2="600" y2="200" stroke="var(--line)"/>`;
        const lenTxt = len >= 10 ? len.toFixed(1) : len.toFixed(2), armTxt = (len / 2).toFixed(len >= 10 ? 1 : 2);
        $('laOut').innerHTML = t(`Un dipolo para <b>${name}</b> mide unos <b>${lenTxt} m</b> de punta a punta: dos brazos de ${armTxt} m.`,
          `A dipole for <b>${name}</b> is about <b>${lenTxt} m</b> from end to end: two arms of ${armTxt} m.`);
        box.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      }
      // Un solo escuchador para los botones de banda (data-i = posición en `bands`).
      box.querySelector('#laBands').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) draw(+b.dataset.i); });
      draw(1);
      return null;
    },
    /**
     * Lección "La ionosfera": camino de la onda según frecuencia, hora y actividad solar.
     * Modelo didáctico muy simplificado (no es un cálculo real):
     *  - MUF (frecuencia máxima que rebota) = 16 MHz de día y 9 de noche, el doble con "Sol muy activo".
     *  - De día, por debajo de 5 MHz la capa D absorbe la señal.
     *  - Por encima de la MUF la onda atraviesa la ionosfera y se pierde.
     *  - Si rebota, la distancia del salto crece con la frecuencia.
     * @param {HTMLElement} box Contenedor del dibujo.
     * @returns {null} No anima.
     */
    ionosfera(box) {
      // Bandas que se pueden elegir: [nombre, MHz]. Estado: fi = banda elegida (empieza en 40 m),
      // day = de día según la hora del dispositivo (8:00-18:59), sun = Sol muy activo.
      const freqs = [['80 m', 3.6], ['40 m', 7.1], ['20 m', 14.2], ['10 m', 28.5]];
      let fi = 1, day = new Date().getHours() >= 8 && new Date().getHours() < 19, sun = false;
      box.innerHTML = `<svg class="lesson-svg" viewBox="0 0 600 260" id="liSvg" aria-hidden="true"></svg>
        <div class="row"><div class="chips" id="liF">${freqs.map((b, i) => `<button class="chip" data-i="${i}">${b[0]}</button>`).join('')}</div>
        <div class="chips"><button class="chip" id="liDay"></button><button class="chip" id="liSun">${t('☀️ Sol muy activo', '☀️ Very active Sun')}</button></div></div>
        <p class="lesson-readout" id="liOut" aria-live="polite"></p>`;
      /**
       * Calcula el caso (absorbida, escapa o rebota), dibuja el SVG y actualiza texto y botones.
       * Coordenadas del SVG (viewBox 600 × 260): la persona en (40, 230); la capa F a y = 70 de día y 90 de
       * noche (en SVG, menor y = más arriba); la capa D, solo de día, entre y = 150 y 170; el suelo, desde y ≈ 230.
       */
      function draw() {
        const f = freqs[fi][1];
        const muf = (day ? 16 : 9) * (sun ? 2 : 1);
        const absorbed = day && f < 5;
        const escapes = f > muf;
        const hF = day ? 70 : 90; // altura de la capa F en el dibujo (menor y = más alto)
        let path, out;
        if (absorbed) {
          path = 'M40 230 Q90 170 140 150'; out = t('De día la capa D se traga esta frecuencia: la señal se apaga antes de rebotar. Prueba de noche.', 'By day the D layer swallows this frequency: the signal fades before it can bounce. Try at night.');
        } else if (escapes) {
          path = 'M40 230 Q200 120 300 20'; out = t(`Va por encima de la frecuencia máxima (≈${muf} MHz ahora): atraviesa la ionosfera y se pierde en el espacio.`, `It is above the maximum frequency (≈${muf} MHz now): it goes through the ionosphere and is lost in space.`);
        } else {
          // Ancho del salto en px (160 + 22 px por MHz, hasta 520) y su distancia "real" a razón de 6 km por px:
          // por ejemplo 40 m (7,1 MHz) → 316 px → unos 1.900 km. Orientativo.
          const dist = Math.min(520, 160 + f * 22);
          path = `M40 230 L${40 + dist / 2} ${hF} L${40 + dist} 230`;
          out = t(`Rebota en la capa F y cae a unos <b>${Math.round(dist * 6)} km</b>. Con varios saltos puede dar la vuelta al mundo.`, `It bounces off the F layer and comes down about <b>${Math.round(dist * 6)} km</b> away. With several hops it can go round the world.`);
        }
        $('liSvg').innerHTML = `
          <rect x="0" y="${hF - 22}" width="600" height="30" fill="var(--accent)" opacity=".12"/>
          <text x="590" y="${hF - 4}" fill="var(--muted)" font-size="12" text-anchor="end">${t('capa F', 'F layer')}</text>
          ${day ? `<rect x="0" y="150" width="600" height="20" fill="var(--hot)" opacity=".14"/><text x="590" y="164" fill="var(--muted)" font-size="12" text-anchor="end">${t('capa D (solo de día)', 'D layer (daytime only)')}</text>` : ''}
          <path d="M0 238 Q300 222 600 238 L600 260 L0 260Z" fill="var(--panel)" stroke="var(--line)"/>
          <path d="${path}" fill="none" stroke="${absorbed ? 'var(--red)' : 'var(--accent)'}" stroke-width="3" stroke-dasharray="${absorbed ? '6 5' : 'none'}"/>
          <circle cx="40" cy="230" r="6" fill="var(--hot)"/><text x="40" y="252" fill="var(--muted)" font-size="11" text-anchor="middle">${t('tú', 'you')}</text>
          <text x="20" y="24" fill="var(--ink)" font-size="13">${day ? t('☀️ Día', '☀️ Day') : t('🌙 Noche', '🌙 Night')} · ${freqs[fi][0]} (${f} MHz)</text>`;
        $('liOut').innerHTML = out;
        $('liDay').textContent = day ? t('🌙 Pasar a noche', '🌙 Switch to night') : t('☀️ Pasar a día', '☀️ Switch to day');
        $('liSun').classList.toggle('on', sun);
        box.querySelectorAll('#liF .chip').forEach(b => b.classList.toggle('on', +b.dataset.i === fi));
      }
      // Controles: banda, día/noche y Sol activo. Cada uno cambia el estado y redibuja.
      box.querySelector('#liF').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { fi = +b.dataset.i; draw(); } });
      box.querySelector('#liDay').addEventListener('click', () => { day = !day; draw(); });
      box.querySelector('#liSun').addEventListener('click', () => { sun = !sun; draw(); });
      draw();
      return null;
    },
    /**
     * Lección "Cómo viaja tu voz": portadora animada modulada en AM, FM, CW o BLU (SSB).
     * @param {HTMLElement} box Contenedor del dibujo.
     * @returns {Function} Parar la animación.
     */
    modos(box) {
      const modes = ['AM', 'FM', 'CW', 'SSB'];
      // m = modo elegido (posición en `modes`), tm = tiempo de la animación, run = animación en marcha.
      let m = 0, tm = 0, run = false;
      box.innerHTML = `<canvas class="lesson-canvas" aria-hidden="true"></canvas>
        <div class="chips" id="lmM">${modes.map((x, i) => `<button class="chip${i ? '' : ' on'}" data-i="${i}">${x === 'SSB' ? t('BLU (SSB)', 'SSB') : x}</button>`).join('')}</div>
        <p class="lesson-readout" id="lmOut" aria-live="polite"></p>`;
      // Explicación de cada modo, en el mismo orden que `modes`.
      const text = [
        t('AM: la portadora sube y baja de fuerza siguiendo tu voz (la línea amarilla).', 'AM: the carrier gets stronger and weaker following your voice (the yellow line).'),
        t('FM: la fuerza es constante; lo que cambia es lo apretadas que van las ondas.', 'FM: the strength stays the same; what changes is how tightly packed the waves are.'),
        t('CW: la portadora se enciende y se apaga. Eso es Morse.', 'CW: the carrier is switched on and off. That is Morse.'),
        t('BLU: no hay portadora fija; solo sale energía cuando hablas. Por eso llega más lejos.', 'SSB: there is no steady carrier; energy only goes out when you speak. That is why it reaches further.'),
      ];
      /**
       * Dibuja un fotograma: recorre el ancho píxel a píxel acumulando la fase de la portadora y aplicando
       * a cada punto la amplitud (a) y la frecuencia (f, radianes por píxel) que tocan según el modo.
       */
      function frame() {
        const { g, w, h } = sizeCanvas(c);
        g.clearRect(0, 0, w, h);
        // voice(x): "voz" inventada, suma de dos senos lentos (valores entre −0,9 y 0,9) que se desplaza con tm.
        // key(x): manipulador Morse (1 = tono, 0 = silencio) con un patrón fijo de puntos y huecos que avanza.
        const voice = x => Math.sin(x * 0.018 - tm * 0.6) * 0.6 + Math.sin(x * 0.041 - tm) * 0.3;
        const key = x => ((Math.floor((x + tm * 30) / 60) % 4) !== 3 && (Math.floor((x + tm * 30) / 20) % 3) !== 2) ? 1 : 0;
        g.lineWidth = 1.6; g.strokeStyle = css('--accent'); g.beginPath();
        // Acumular la fase (en lugar de usar sin(f·x)) permite cambiar la frecuencia punto a punto sin saltos: así se ve la FM.
        let phase = 0;
        for (let x = 0; x <= w; x += 1) {
          // AM: amplitud que sigue a la voz. FM: amplitud fija y frecuencia que sigue a la voz.
          // CW: amplitud 0 o 1. BLU: solo hay señal cuando la voz es positiva (no hay portadora fija).
          let a = 1, f = 0.55;
          if (m === 0) a = 0.55 + 0.4 * voice(x);
          if (m === 1) { f = 0.55 + 0.35 * voice(x); }
          if (m === 2) a = key(x);
          if (m === 3) a = Math.max(0, voice(x)) * 1.1;
          phase += f;
          const y = h / 2 - Math.sin(phase - tm * 4) * a * h * 0.38;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        // En AM y BLU se dibuja además la envolvente (la forma de la voz) como línea discontinua amarilla (--hot).
        if (m === 0 || m === 3) {
          g.strokeStyle = css('--hot'); g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath();
          for (let x = 0; x <= w; x += 3) { const a = m === 0 ? 0.55 + 0.4 * voice(x) : Math.max(0, voice(x)) * 1.1; const y = h / 2 - a * h * 0.38; x ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke(); g.setLineDash([]);
        }
        tm += 0.05;
        if (run && !Radio.reducedMotion) requestAnimationFrame(frame);
      }
      const c = box.querySelector('canvas');
      // Cambio de modo: actualiza el texto, redibuja si no está animando y marca el botón elegido.
      box.querySelector('#lmM').addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        m = +b.dataset.i; $('lmOut').textContent = text[m];
        if (!run) frame();
        box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
      });
      $('lmOut').textContent = text[0];
      frame(); // primer dibujo, aunque no se anime
      return animate(c, () => { if (!run) { run = true; frame(); } }, () => { run = false; });
    },
  };

  /* ---------- Interfaz ---------- */
  /**
   * Pinta las pestañas de lección, marcando la abierta (clase "on" y aria-pressed) y con ✓ las completadas.
   * @returns {void}
   */
  function renderTabs() {
    $('lessonTabs').innerHTML = LESSONS.map(l =>
      `<button type="button" class="lesson-tab${l === current ? ' on' : ''}" data-id="${l.id}" aria-pressed="${l === current}">${l.icon} ${l.title}${done[l.id] ? ' <span class="tick">✓</span>' : ''}</button>`).join('');
  }
  /**
   * Marca el botón del nivel elegido y muestra el texto de ese nivel para la lección abierta.
   * El texto viene de LESSONS (HTML propio) y se inserta sin escapar.
   * @returns {void}
   */
  function renderLevel() {
    $('lessonLevels').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('on', i === level); b.setAttribute('aria-pressed', String(i === level)); });
    $('lessonText').innerHTML = `<p>${current.levels[level]}</p>`;
  }
  /**
   * Pinta las 3 preguntas de la lección abierta y gestiona las respuestas.
   * Cada pregunta se responde una sola vez (data-done): se marca la correcta en verde ("right") y, si fallaste,
   * la tuya en rojo ("wrong"). Al responder todas: con 3 aciertos la lección queda completada (se guarda,
   * se marca la pestaña, Radio.track y evento `radio:progress`); si no, invita a subir de nivel.
   * Se usa `onclick` (no addEventListener) para que, al volver a pintar, el escuchador anterior se sustituya.
   * @returns {void}
   */
  function renderQuiz() {
    let hits = 0, answered = 0;
    $('lessonQuiz').innerHTML = t('<h3 class="lq-title">Comprueba que lo has pillado</h3>', '<h3 class="lq-title">Check you have got it</h3>') + current.quiz.map((q, qi) =>
      `<div class="lq" data-q="${qi}"><p>${esc(q.q)}</p><div class="lq-opts">${q.a.map((a, ai) => `<button class="opt wide" data-a="${ai}">${esc(a)}</button>`).join('')}</div></div>`).join('') +
      '<p class="lq-result" id="lqResult"></p>';
    $('lessonQuiz').onclick = e => {
      const b = e.target.closest('.opt'); if (!b) return;
      const box = b.closest('.lq'); if (box.dataset.done) return;
      box.dataset.done = 1; answered++;
      const q = current.quiz[+box.dataset.q];
      box.querySelectorAll('.opt')[q.ok].classList.add('right');
      if (+b.dataset.a === q.ok) hits++; else b.classList.add('wrong');
      if (answered === current.quiz.length) {
        $('lqResult').textContent = hits === 3 ? t('¡Perfecto! Lección completada ✓', 'Perfect! Lesson complete ✓') : t(`${hits} de 3. Sube un nivel de explicación y vuelve a probar.`, `${hits} out of 3. Move up a level of explanation and try again.`);
        if (hits === 3) { Radio.track(`leccion/${current.id}`); done[current.id] = true; store.set('radio.lessons', done); renderTabs(); document.dispatchEvent(new CustomEvent('radio:progress')); }
      }
    };
  }
  /**
   * Abre una lección: para la animación anterior, monta su dibujo y pinta pestañas, texto y test.
   * @param {object} l Entrada de LESSONS.
   * @returns {void}
   */
  function show(l) {
    current = l;
    if (stopAnim) stopAnim();
    stopAnim = STAGES[l.id]($('lessonStage'));
    renderTabs(); renderLevel(); renderQuiz();
  }

  // Pestañas (data-id = id de la lección) y botones de nivel (data-l = 0, 1 o 2). Al cargar se abre la primera.
  $('lessonTabs').addEventListener('click', e => { const b = e.target.closest('.lesson-tab'); if (b) show(LESSONS.find(l => l.id === b.dataset.id)); });
  $('lessonLevels').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { level = +b.dataset.l; renderLevel(); } });
  show(LESSONS[0]);
})();
