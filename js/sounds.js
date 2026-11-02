/**
 * sounds.js · "¿Qué es este sonido?": galería de sonidos de la radio con cascada en directo.
 *
 * Página: Escuchar (#sonidos). Necesita: #waterfall (canvas), #soundGrid, #soundInfo, #soundNow, #soundStop.
 * Depende de: morse.js (tabla Morse.CODE para el Morse y la baliza). Usa Radio para Radio.emit y Radio.t.
 *
 * Los ocho sonidos se SINTETIZAN con Web Audio imitando los reales (las grabaciones reales están en recordings.js):
 *   cw (Morse), ft8 (8-FSK, 6,25 Hz entre tonos, símbolos de 0,16 s), rtty (dos tonos a 170 Hz, 45,45 baudios),
 *   beacon (baliza NCDXF: indicativo + 4 rayas a 100/10/1/0,1 W), pips (señal horaria),
 *   tuning (portadora que se desplaza), qrn (estática con chasquidos), buzz (armónicos cada 100 Hz).
 * La cascada es un AnalyserNode (FFT de 4096) pintado fila a fila de 0 a 3 kHz.
 *
 * Cadena de audio: cada oscilador o ruido → su ganancia → `master` (0,9) → `analyser` → altavoces.
 * El analizador está en medio de la cadena, así que "ve" exactamente lo que suena.
 * Todos los tiempos de Web Audio van en SEGUNDOS desde que se creó el contexto (ctx.currentTime), y las
 * frecuencias en hercios (Hz). Los sonidos se programan enteros por adelantado; no hay bucles de JavaScript
 * mientras suenan (solo el del dibujo de la cascada).
 *
 * Rendimiento: el bucle de dibujo solo corre mientras suena algo y 1,5 s después; luego se para.
 * Accesibilidad: cada sonido es un botón con aria-pressed; la descripción en texto (qué es y cómo
 * se ve en la cascada) está en #soundInfo, así que el canvas es solo un apoyo visual (en el HTML lleva
 * un aria-label genérico que lo identifica como cascada).
 * Logro: Radio.emit('sound', id).
 * Textos: en los dos idiomas con Radio.t (los sonidos son tonos sintéticos, no tienen idioma).
 * No guarda nada en localStorage ni usa servicios externos (el enlace al WebSDR solo se abre si se pulsa).
 *
 * Cómo modificarlo:
 *  - Añadir un sonido: (1) una entrada en SOUNDS con id, icon, name, tune ('<kHz><modo>' para el WebSDR),
 *    what (qué es) y look (cómo se ve en la cascada); (2) una función con ese mismo id en SYNTH que reciba
 *    el instante de inicio `t`, programe el sonido con tone(), noise() o keyer() y devuelva el instante en
 *    que termina. Si sale de 3 kHz, no se verá en la cascada (MAXF).
 *  - Cambiar el texto de un sonido: SOUNDS. Cambiar cómo suena: su función en SYNTH.
 *  - Cambiar los colores de la cascada: color(); el fondo vacío está en clear().
 *  - Cambiar cuánto sigue cayendo la cascada tras parar: los 1500 ms de stop().
 */
(() => {
  'use strict';
  if (!document.getElementById('sonidos')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const { t } = Radio;
  // Copia de WEBSDR de data.js (este módulo no depende de data.js). Si cambia, cámbiala en los dos sitios.
  const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';

  /* ---------- Catálogo ---------- */
  // Cada sonido: id (clave en SYNTH y data-id del botón), icon, name, tune (frecuencia y modo en el WebSDR
  // donde suele oírse de verdad), what (qué es) y look (cómo se ve en la cascada). Textos propios, sin escapar.
  const SOUNDS = [
    { id: 'cw', icon: '📟', name: 'Morse (CW)', tune: '7020cw',
      what: t('Pitidos cortos y largos de un solo tono. Es un radioaficionado llamando “CQ” en telegrafía.', 'Short and long beeps on a single tone. It is a radio amateur calling “CQ” in telegraphy.'),
      look: t('En la cascada: una raya fina y vertical que se corta y vuelve, como un código de barras.', 'On the waterfall: a thin vertical line that breaks off and comes back, like a barcode.') },
    { id: 'ft8', icon: '🤖', name: 'FT8 (digital)', tune: '14074usb',
      what: t('Varios pitidos suaves que cambian de nota durante unos 13 segundos y luego paran. Son ordenadores haciendo contactos.', 'Several soft beeps that change note for about 13 seconds and then stop. These are computers making contacts.'),
      look: t('En la cascada: escaleras estrechas, una al lado de otra, todas empezando y acabando a la vez.', 'On the waterfall: narrow staircases side by side, all starting and ending at the same time.') },
    { id: 'rtty', icon: '📠', name: t('Radioteletipo (RTTY)', 'Radioteletype (RTTY)'), tune: '14085usb',
      what: t('Un “burbujeo” rápido entre dos notas. Es texto enviado letra a letra, como un télex.', 'A fast “bubbling” between two notes. It is text sent letter by letter, like a telex.'),
      look: t('En la cascada: dos rayas paralelas muy juntas que parpadean.', 'On the waterfall: two parallel lines, very close together, that flicker.') },
    { id: 'beacon', icon: '🗼', name: t('Baliza', 'Beacon'), tune: '14100cw',
      what: t('Un indicativo en Morse y cuatro rayas largas cada vez más flojas. Sirven para comprobar hasta dónde llega la señal.', 'A callsign in Morse and four long dashes, each one quieter. They are used to check how far signals are getting.'),
      look: t('En la cascada: el indicativo y luego cuatro trazos que se van apagando.', 'On the waterfall: the callsign, then four strokes that fade away.') },
    { id: 'pips', icon: '⏱️', name: t('Señal horaria', 'Time signal'), tune: '9996am',
      what: t('Pitidos exactos cada segundo y uno más largo al final: marcan la hora en punto.', 'Precise beeps every second and a longer one at the end: they mark the exact hour.'),
      look: t('En la cascada: puntos regulares, como las marcas de un reloj.', 'On the waterfall: evenly spaced dots, like the marks on a clock.') },
    { id: 'tuning', icon: '🎛️', name: t('Portadora (silbido)', 'Carrier (whistle)'), tune: '7100lsb',
      what: t('Un silbido que sube o baja de tono. Es una señal sin modular mientras alguien gira el dial.', 'A whistle that rises or falls in pitch. It is an unmodulated signal while someone turns the dial.'),
      look: t('En la cascada: una línea que se inclina hacia un lado.', 'On the waterfall: a line that slants to one side.') },
    { id: 'qrn', icon: '⛈️', name: t('Estática (QRN)', 'Static (QRN)'), tune: '3700lsb',
      what: t('Ruido de fondo con chasquidos. Son tormentas, a veces a cientos de kilómetros.', 'Background noise with crackles. These are thunderstorms, sometimes hundreds of kilometres away.'),
      look: t('En la cascada: manchas horizontales que cruzan todo el ancho de golpe.', 'On the waterfall: horizontal smudges that suddenly cross the whole width.') },
    { id: 'buzz', icon: '🔌', name: t('Interferencia (QRM)', 'Interference (QRM)'), tune: '7100lsb',
      what: t('Un zumbido áspero. Suele venir de cargadores, LED o fuentes baratas de casa.', 'A harsh buzz. It usually comes from chargers, LED lights or cheap power supplies at home.'),
      look: t('En la cascada: muchas rayas verticales a la misma distancia, como un peine.', 'On the waterfall: lots of evenly spaced vertical lines, like a comb.') },
  ];

  // ctx: AudioContext; master: ganancia general; analyser: el que alimenta la cascada;
  // playing: nodos que están sonando (para poder pararlos); timer: parada automática; raf: bucle de dibujo.
  let ctx, master, analyser, playing = [], timer = null, raf = null;

  /* ---------- Piezas de sonido ---------- */
  /**
   * Prepara el audio la primera vez y lo reactiva si el navegador lo había suspendido.
   * Se crea al pulsar un sonido (no al cargar) porque los navegadores solo dejan arrancar audio tras un
   * gesto de la persona. webkitAudioContext es para Safari antiguo.
   * Analizador: fftSize 4096 → 2048 franjas de frecuencia de unos 11,7 Hz cada una (a 48 kHz), suficiente
   * para separar los tonos de FT8 en la cascada. smoothingTimeConstant 0,2: poco suavizado, para que
   * los cambios rápidos (RTTY, Morse) se vean nítidos.
   * @returns {AudioContext} El contexto, listo para programar sonidos.
   */
  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.2;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(analyser).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * Programa un tono puro.
   * Sube y baja el volumen en 4 ms (r) en lugar de cortarlo en seco: un corte brusco suena como un "clic"
   * y en la cascada se vería como una raya horizontal.
   * @param {number} freq  Frecuencia en Hz.
   * @param {number} start  Instante de inicio, en segundos de ctx.currentTime.
   * @param {number} len  Duración en segundos.
   * @param {number} [level=0.3]  Volumen de 0 a 1.
   * @param {OscillatorType} [type='sine']  Forma de onda ('sine', 'sawtooth'…).
   * @returns {OscillatorNode} El oscilador, por si hay que cambiarle la frecuencia después (tuning()).
   * Efectos: lo añade a `playing`. Se detiene solo 20 ms después de terminar.
   */
  function tone(freq, start, len, level = 0.3, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g).connect(master);
    const r = 0.004;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + r);
    g.gain.setValueAtTime(level, start + len - r);
    g.gain.linearRampToValueAtTime(0, start + len);
    o.start(start); o.stop(start + len + 0.02);
    playing.push(o);
    return o;
  }

  /**
   * Programa ruido de fondo (el "shhh" de la radio), opcionalmente con chasquidos de tormenta.
   * Genera ruido blanco muestra a muestra y lo pasa por un filtro paso bajo de 3000 Hz, como el ancho de
   * un canal de voz (y el ancho que muestra la cascada).
   * Chasquidos: en cada muestra hay una probabilidad de 0,00012 (unos 5 por segundo a 44,1-48 kHz) de
   * empezar una ráfaga de 10 a 60 ms con 6 veces más amplitud.
   * @param {number} start  Inicio en segundos (ctx.currentTime).
   * @param {number} len  Duración en segundos.
   * @param {number} [level=0.03]  Volumen de 0 a 1.
   * @param {boolean} [crackles=false]  true para añadir chasquidos (QRN).
   * Efectos: añade la fuente a `playing`.
   */
  function noise(start, len, level = 0.03, crackles = false) {
    const n = Math.ceil(ctx.sampleRate * len);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // burst: muestras que quedan de la ráfaga en curso (0 = no hay ráfaga).
    let burst = 0;
    for (let i = 0; i < n; i++) {
      if (crackles && Math.random() < 0.00012) burst = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.05));
      const b = burst-- > 0 ? 6 * Math.random() : 1;
      d[i] = (Math.random() * 2 - 1) * b;
    }
    // Aunque se llame `bp`, el filtro es paso bajo (lowpass).
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; bp.type = 'lowpass'; bp.frequency.value = 3000; g.gain.value = level;
    src.connect(bp).connect(g).connect(master);
    src.start(start); src.stop(start + len);
    playing.push(src);
  }

  // Morse con el mismo código que js/morse.js
  /**
   * Programa un texto en Morse con tiempos estándar:
   *  - punto = 1,2 / ppm segundos (norma "PARIS": a 20 palabras por minuto, 60 ms).
   *  - raya = 3 puntos; silencio entre señales de una letra = 1 punto;
   *  - entre letras = 3 puntos (1 tras la señal + 2 más); entre palabras = 7 (3 + 4 del espacio).
   * Caracteres que no están en Morse.CODE se saltan.
   * @param {string} text  Texto a emitir.
   * @param {number} start  Inicio en segundos (ctx.currentTime).
   * @param {number} wpm  Velocidad en palabras por minuto.
   * @param {number} freq  Tono en Hz.
   * @param {number} [level=0.3]  Volumen de 0 a 1.
   * @returns {number} Instante en que termina el texto.
   */
  function keyer(text, start, wpm, freq, level = 0.3) {
    const dot = 1.2 / wpm;
    let t = start;
    for (const ch of text.toUpperCase()) {
      if (ch === ' ') { t += dot * 4; continue; }
      const code = Morse.CODE[ch]; if (!code) continue;
      for (const s of code) { const len = s === '.' ? dot : dot * 3; tone(freq, t, len, level); t += len + dot; }
      t += dot * 2;
    }
    return t;
  }

  /* ---------- Los ocho sonidos ---------- */
  // Cada función recibe `t` (inicio, en segundos de ctx.currentTime), programa su sonido y devuelve el
  // instante en que termina, que play() usa para pararlo y soltar el botón. Todos llevan algo de ruido
  // de fondo para que suenen "a radio".
  const SYNTH = {
    /** Morse: CQ de un indicativo inventado (EA4ZZ) a 20 ppm y 700 Hz, el tono habitual de escucha en CW. */
    cw(t) { noise(t, 9, 0.02); return keyer('CQ CQ DE EA4ZZ EA4ZZ K', t + 0.3, 20, 700); },
    /**
     * FT8: cuatro estaciones a la vez en distintos puntos del canal (700, 1180, 1630 y 2210 Hz), cada una con
     * su volumen. FT8 real es 8-FSK: 79 símbolos de 0,16 s (12,64 s en total) y en cada símbolo suena uno de
     * 8 tonos separados 6,25 Hz. Aquí los símbolos son aleatorios (no es un mensaje real). Cada estación
     * empieza con 0,5-0,8 s de retraso, como los relojes reales que nunca están del todo sincronizados.
     */
    ft8(t) {
      noise(t, 13.5, 0.02);
      [[700, 0.12], [1180, 0.2], [1630, 0.08], [2210, 0.15]].forEach(([base, lvl]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = base; g.gain.value = 0;
        o.connect(g).connect(master);
        const s = t + 0.5 + Math.random() * 0.3;
        for (let k = 0; k < 79; k++) o.frequency.setValueAtTime(base + Math.floor(Math.random() * 8) * 6.25, s + k * 0.16);
        // Entrada en 50 ms y salida justo tras los 79 símbolos (12,6 s), sin clics.
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(lvl, s + 0.05);
        g.gain.setValueAtTime(lvl, s + 12.6); g.gain.linearRampToValueAtTime(0, s + 12.65);
        o.start(s); o.stop(s + 12.7); playing.push(o);
      });
      return t + 13.5;
    },
    /**
     * RTTY: un único oscilador que salta entre 1275 y 1445 Hz (desplazamiento estándar de 170 Hz) a
     * 45,45 baudios, es decir, un bit cada 1/45,45 s ≈ 22 ms. Bits aleatorios durante unos 6 s.
     */
    rtty(t) {
      noise(t, 7, 0.02);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 1275; g.gain.value = 0.25;
      o.connect(g).connect(master);
      const bit = 1 / 45.45;
      for (let k = 0, s = t + 0.3; s < t + 6.5; k++, s += bit) o.frequency.setValueAtTime(Math.random() < 0.5 ? 1275 : 1445, s);
      o.start(t + 0.3); o.stop(t + 6.6); playing.push(o);
      return t + 7;
    },
    /**
     * Baliza del proyecto NCDXF: indicativo (4U1UN, la de la ONU en Nueva York) a 22 ppm y luego cuatro rayas
     * de 1 s emitidas a 100, 10, 1 y 0,1 W. Cada paso es 10 veces menos potencia (−10 dB); los volúmenes
     * 0,32 → 0,11 → 0,035 → 0,012 bajan unas 3 veces de amplitud por paso, que es aproximadamente −10 dB.
     */
    beacon(t) {
      noise(t, 10.5, 0.02);
      let e = keyer('4U1UN', t + 0.3, 22, 800, 0.32) + 0.4;
      [0.32, 0.11, 0.035, 0.012].forEach(l => { tone(800, e, 1.0, l); e += 1.25; });
      return e + 0.3;
    },
    /** Señal horaria: cinco pitidos de 0,1 s a 1000 Hz, uno por segundo, y uno largo de 0,5 s que marca el segundo exacto. */
    pips(t) {
      noise(t, 7, 0.015);
      for (let k = 0; k < 5; k++) tone(1000, t + 0.5 + k, 0.1, 0.3);
      tone(1000, t + 5.5, 0.5, 0.3);
      return t + 6.5;
    },
    /**
     * Portadora al girar el dial: un tono que sube de 400 a 2200 Hz y baja a 900 Hz. La rampa es exponencial
     * para que el cambio de nota suene uniforme al oído (que percibe la frecuencia en escala logarítmica).
     */
    tuning(t) {
      noise(t, 6, 0.02);
      const o = tone(400, t + 0.2, 5.4, 0.22);
      o.frequency.setValueAtTime(400, t + 0.2);
      o.frequency.exponentialRampToValueAtTime(2200, t + 3);
      o.frequency.exponentialRampToValueAtTime(900, t + 5.6);
      return t + 6;
    },
    /** Estática (QRN): solo ruido más fuerte, con chasquidos de rayos lejanos. */
    qrn(t) { noise(t, 7, 0.06, true); return t + 7; },
    /**
     * Interferencia (QRM) de una fuente conmutada: 28 armónicos de 100 Hz (100, 200… 2800 Hz) en diente de
     * sierra, cada vez más flojos (volumen 0,05/√n). En la cascada forman el "peine" de rayas equidistantes.
     */
    buzz(t) {
      noise(t, 6, 0.015);
      for (let h = 1; h <= 28; h++) tone(100 * h, t + 0.2, 5.5, 0.05 / Math.sqrt(h), 'sawtooth');
      return t + 6;
    },
  };

  /* ---------- Cascada ---------- */
  const canvas = $('waterfall');
  const g2 = canvas.getContext('2d');
  // Frecuencia máxima que se muestra (Hz): el ancho del canvas va de 0 a 3000 Hz.
  const MAXF = 3000;
  /**
   * Paleta de la cascada: convierte una intensidad en color RGB, en tres tramos con interpolación lineal.
   *  - 0 a 0,35: casi negro a gris oscuro (ruido de fondo).
   *  - 0,35 a 0,7: gris a menta (#8be0c2, el color de acento de la web).
   *  - 0,7 a 1: menta a amarillo (señales fuertes).
   * @param {number} v  Intensidad de 0 a 255 (puede pasarse algo de 255; el canvas lo recorta).
   * @returns {number[]} [rojo, verde, azul], cada uno de 0 a 255.
   */
  function color(v) { // 0..255 → gris oscuro → menta → amarillo
    const x = v / 255;
    if (x < 0.35) return [17 + x * 60, 18 + x * 80, 22 + x * 90];
    if (x < 0.7) { const k = (x - 0.35) / 0.35; return [38 + k * 101, 46 + k * 178, 54 + k * 140]; }
    const k = (x - 0.7) / 0.3; return [139 + k * 116, 224 - k * 14, 194 - k * 72];
  }
  /** Pinta el canvas entero del color de fondo (#111214, casi negro). */
  function clear() {
    g2.fillStyle = '#111214'; g2.fillRect(0, 0, canvas.width, canvas.height);
  }
  /**
   * Dibuja una fila nueva de la cascada y programa la siguiente (requestAnimationFrame, ~60 por segundo).
   * 1. Desplaza todo el dibujo 1 px hacia abajo (copia las filas 0…h−2 a partir de la fila 1).
   * 2. Pinta la fila 0 con el espectro actual: para cada píxel x, su frecuencia es x/w · 3000 Hz y su franja
   *    del analizador es esa frecuencia / (sampleRate / fftSize) Hz por franja.
   * 3. Intensidad: se restan 60 (de 0-255) para que el ruido de fondo quede oscuro y se multiplica por 1,35
   *    para dar contraste a las señales.
   * Se detiene sola cuando no suena nada y han pasado los 1,5 s de "cola" (tailUntil), para no gastar batería.
   * Efectos: el canvas #waterfall y la variable `raf`.
   */
  function draw() {
    const w = canvas.width, h = canvas.height;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    const img = g2.getImageData(0, 0, w, h - 1);
    g2.putImageData(img, 0, 1);
    const row = g2.createImageData(w, 1);
    const hzPerBin = ctx.sampleRate / analyser.fftSize;
    for (let x = 0; x < w; x++) {
      const v = bins[Math.min(bins.length - 1, Math.round((x / w) * MAXF / hzPerBin))];
      const [r, gg, b] = color(Math.max(0, v - 60) * 1.35);
      // Cada píxel ocupa 4 posiciones en row.data: rojo, verde, azul y opacidad (255 = opaco).
      row.data.set([r, gg, b, 255], x * 4);
    }
    g2.putImageData(row, 0, 0);
    // Se detiene sola un poco después del último sonido (deja caer la cascada) para no gastar batería
    if (playing.length || performance.now() < tailUntil) raf = requestAnimationFrame(draw);
    else raf = null;
  }
  // Instante (en ms de performance.now()) hasta el que la cascada sigue cayendo tras parar.
  let tailUntil = 0;

  /* ---------- Reproducción ---------- */
  /**
   * Para todo lo que suena, cancela la parada automática y deja la cascada cayendo 1,5 s más.
   * Efectos: suelta todos los botones (clase "on" y aria-pressed="false") y repone el texto de #soundNow.
   * stop() puede lanzar error en un nodo que ya terminó: se ignora.
   */
  function stop() {
    playing.forEach(n => { try { n.stop(); } catch (e) {} });
    playing = [];
    clearTimeout(timer);
    tailUntil = performance.now() + 1500;
    document.querySelectorAll('.sound-card').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    $('soundNow').textContent = t('Elige un sonido para oírlo y verlo', 'Choose a sound to hear it and see it');
  }

  /**
   * Hace sonar uno de los sonidos (parando antes el anterior) y muestra su explicación.
   * Empieza 50 ms en el futuro (ctx.currentTime + 0.05) para que dé tiempo a programarlo todo sin cortes.
   * La parada automática se programa para cuando acaba el sonido, más 200 ms de margen.
   * @param {Object} s  Entrada de SOUNDS.
   * Efectos: audio, arranca la cascada si estaba parada, marca su botón (clase "on", aria-pressed="true"),
   *   emite el logro 'sound' con su id y reescribe #soundNow y #soundInfo (con el enlace al WebSDR).
   */
  function play(s) {
    audio();
    stop();
    const end = SYNTH[s.id](ctx.currentTime + 0.05);
    if (!raf) draw();
    const card = document.querySelector(`.sound-card[data-id="${s.id}"]`);
    card.classList.add('on'); card.setAttribute('aria-pressed', 'true');
    Radio.emit('sound', s.id);
    $('soundNow').textContent = `▶ ${s.name}`;
    $('soundInfo').innerHTML = `<h3>${s.icon} ${s.name}</h3><p>${s.what}</p><p class="look">${s.look}</p>
      <a class="btn small ghost" href="${WEBSDR + s.tune}" target="_blank" rel="noopener">${t('🎧 Búscalo en un receptor de verdad', '🎧 Find it on a real receiver')}</a>`;
    timer = setTimeout(stop, (end - ctx.currentTime) * 1000 + 200);
  }

  /* ---------- Grabaciones reales en la cascada ----------
   * recordings.js avisa con el evento 'radio:waterfall' ({ el: <audio>, label }) al reproducir una grabación.
   * Se conecta ese <audio> a la misma cadena (master → analizador → altavoces) que los sonidos sintéticos,
   * así la grabación real se dibuja en la cascada y se puede comparar con la imitación.
   * Un <audio> solo admite un createMediaElementSource en toda su vida: se guarda en SOURCES para reutilizarlo.
   * Mientras suena, un "nodo" falso en `playing` mantiene viva la cascada; stop() lo pausa. */
  const SOURCES = new WeakMap();
  document.addEventListener('radio:waterfall', e => {
    const { el, label } = e.detail || {};
    if (!el) return;
    try {
      audio();
      stop();
      if (!SOURCES.has(el)) { const src = ctx.createMediaElementSource(el); src.connect(master); SOURCES.set(el, src); }
    } catch (err) { return; } // si el navegador no lo permite, la grabación suena igual por su cuenta
    const node = { stop: () => el.pause() };
    playing.push(node);
    const done = () => {
      playing = playing.filter(n => n !== node);
      tailUntil = performance.now() + 1500;
      el.removeEventListener('pause', done); el.removeEventListener('ended', done);
      if (!playing.length) $('soundNow').textContent = t('Elige un sonido para oírlo y verlo', 'Choose a sound to hear it and see it');
    };
    el.addEventListener('pause', done); el.addEventListener('ended', done);
    $('soundNow').textContent = `▶ ${label}`;
    if (!raf) draw();
  });

  /* ---------- Botones ---------- */
  // Un botón por sonido; el icono va con aria-hidden para que el lector de pantalla lea solo el nombre.
  $('soundGrid').innerHTML = SOUNDS.map(s =>
    `<button type="button" class="sound-card" data-id="${s.id}" aria-pressed="false"><span class="ico" aria-hidden="true">${s.icon}</span><span>${s.name}</span></button>`).join('');
  // Delegación: pulsar un sonido lo hace sonar; pulsar el que ya suena lo para.
  $('soundGrid').addEventListener('click', e => {
    const b = e.target.closest('.sound-card'); if (!b) return;
    const s = SOUNDS.find(x => x.id === b.dataset.id);
    if (b.classList.contains('on')) stop(); else play(s);
  });
  $('soundStop').addEventListener('click', stop);
  // La cascada empieza vacía (fondo oscuro) aunque todavía no se haya creado el audio.
  clear();
})();
