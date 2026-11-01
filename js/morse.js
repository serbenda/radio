/**
 * morse.js · Código Morse: tabla de símbolos, codificación a texto y reproducción con sonido.
 *
 * Es una librería, no un módulo de página: no toca el DOM ni necesita ningún elemento. Se carga ANTES
 * que morse-ui.js, koch.js y sounds.js, que la usan. Expone un único global, `Morse`:
 *
 *  Morse.CODE                    Tabla carácter → código ('.' punto, '-' raya). Incluye Ñ, cifras y . , ? / =
 *  Morse.encode(texto)           Texto → "-.-. --.-" (letras separadas por espacio, "/" entre palabras).
 *  Morse.play(texto, ppm, tono)  Hace sonar el texto. Devuelve una Promise que se resuelve al terminar.
 *  Morse.stop()                  Corta lo que esté sonando.
 *
 * Tiempos (norma PARIS, la que usan todos los cursos y programas de Morse):
 *  - La palabra "PARIS" mide exactamente 50 unidades; a N palabras por minuto (ppm) caben N·50 unidades
 *    en 60 s, así que 1 unidad (= 1 punto) dura 60 / (50·N) = 1,2 / N segundos (1200 / N milisegundos).
 *    Ejemplo: a 20 ppm un punto dura 60 ms.
 *  - Raya = 3 unidades · hueco dentro de la letra = 1 · entre letras = 3 · entre palabras = 7.
 *  - No hay espaciado Farnsworth (huecos alargados): todo va a la velocidad indicada. En koch.js el hueco
 *    "largo" lo pone la propia persona, porque cada letra suena sola y luego se espera su respuesta.
 *
 * Audio: Web Audio API. Un único AudioContext para toda la página (los navegadores limitan cuántos se
 *   pueden crear) y, en cada reproducción, un oscilador senoidal → nodo de ganancia → altavoces.
 *   El oscilador suena sin parar y la ganancia hace de "manipulador": 0 = silencio, 0,35 = tono.
 *   Los navegadores solo dejan arrancar el audio tras un gesto de la persona (clic, tecla), por eso
 *   play() se llama siempre desde un botón.
 *
 * No guarda nada en localStorage, no emite eventos y no usa servicios externos.
 *
 * Cómo modificarlo:
 *  - Añadir un signo: una entrada más en CODE (clave en MAYÚSCULAS, valor con '.' y '-'). encode() y play()
 *    lo usan solos; los caracteres que no están en CODE se ignoran sin dar error.
 *  - Cambiar el volumen: el 0.35 de play() (de 0 a 1; por encima de 0,5 puede saturar).
 *  - Cambiar el tono por defecto: el parámetro `freq` (650 Hz es un tono cómodo y habitual en CW).
 */
const Morse = (() => {
  /* ---------- Tabla de símbolos ---------- */

  /**
   * Tabla de la Recomendación UIT-R M.1677 (Morse internacional) más la Ñ española.
   * Formato: clave = carácter en MAYÚSCULAS; valor = cadena de '.' (punto) y '-' (raya).
   * Para añadir uno nuevo basta con escribir otra entrada; no hay que tocar nada más.
   * @type {Object<string, string>}
   */
  const CODE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', 'Ñ': '--.--', O: '---', P: '.--.', Q: '--.-',
    R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '=': '-...-',
  };

  /* ---------- Codificación ---------- */

  /**
   * Normaliza un texto para buscarlo en CODE: lo pasa a mayúsculas y quita tildes y diéresis
   * (Á → A, Ü → U) pero conserva la Ñ.
   * Cómo: NFD separa cada letra de sus marcas (Á = A + ◌́); la expresión regular borra las marcas
   * combinantes del bloque U+0300–U+036F excepto la tilde de la eñe (U+0303, el carácter que va
   * dentro de `(?!…)`), y NFC vuelve a juntar N + ◌̃ en Ñ.
   * @param {string} s Texto libre.
   * @returns {string} Texto en mayúsculas sin tildes.
   */
  const clean = s => s.toUpperCase().normalize('NFD').replace(/(?!̃)[̀-ͯ]/g, '').normalize('NFC');
  /**
   * Convierte texto en código Morse legible.
   * @param {string} text Texto libre (se normaliza con clean()).
   * @returns {string} Códigos separados por un espacio y "/" por cada espacio del texto,
   *   por ejemplo "CQ DE" → "-.-. --.- / -.. .". Los caracteres desconocidos se descartan.
   */
  const encode = text => clean(text).split('').map(c => (c === ' ' ? '/' : CODE[c] || '')).filter(Boolean).join(' ');

  /* ---------- Sonido ---------- */

  // ctx: AudioContext compartido (se crea la primera vez que suena algo).
  // playing: oscilador de la reproducción en curso, para poder pararlo con stop().
  let ctx = null, playing = null;

  /**
   * Hace sonar un texto en Morse.
   * Programa todos los pitidos de golpe en la línea de tiempo del AudioContext (en segundos), en lugar de
   * usar setTimeout: así el ritmo es exacto aunque la página esté ocupada.
   * Efectos: corta cualquier reproducción anterior (stop) y crea/reanuda el AudioContext.
   * @param {string} text Texto a reproducir (se normaliza con clean()).
   * @param {number} [wpm=15] Velocidad en palabras por minuto (norma PARIS).
   * @param {number} [freq=650] Tono en hercios.
   * @returns {Promise<void>} Se resuelve cuando el oscilador termina (al acabar o al llamar a stop()).
   */
  function play(text, wpm = 15, freq = 650) {
    stop();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // Duración de un punto en segundos (norma PARIS: 1,2 / ppm). Todo lo demás son múltiplos.
    const dot = 1.2 / wpm;
    // Grafo de audio: oscilador senoidal (el tono) → ganancia (abre y cierra el sonido) → altavoces.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    // t = instante (en el reloj del AudioContext) donde empieza el siguiente símbolo.
    // Los 50 ms iniciales dan margen para que el primer pitido no se corte.
    // ramp: 5 ms de subida y bajada en cada pitido; un corte en seco suena como un "clic".
    let t = ctx.currentTime + 0.05;
    const ramp = 0.005; // evita chasquidos
    // Un espacio ya lleva 3 unidades del final de la letra anterior; se suman 4 para llegar a las 7
    // de separación entre palabras.
    for (const ch of clean(text)) {
      if (ch === ' ') { t += dot * 4; continue; } // 7 en total con los 3 de fin de letra
      const code = CODE[ch];
      if (!code) continue;
      // Cada símbolo: rampa de subida, tono mantenido, rampa de bajada; después 1 unidad de silencio.
      for (const sym of code) {
        const len = sym === '.' ? dot : dot * 3;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + ramp);
        gain.gain.setValueAtTime(0.35, t + len - ramp);
        gain.gain.linearRampToValueAtTime(0, t + len);
        t += len + dot;
      }
      // Fin de letra: 1 unidad ya sumada tras el último símbolo + 2 = las 3 de separación entre letras.
      t += dot * 2;
    }
    // El oscilador se para 50 ms después del último silencio; su evento `ended` resuelve la Promise.
    osc.start();
    osc.stop(t + 0.05);
    playing = osc;
    return new Promise(r => { osc.onended = r; });
  }

  /**
   * Para la reproducción en curso, si la hay. Parar el oscilador dispara su `ended`, así que la Promise
   * de play() se resuelve también. El try/catch cubre el caso de un oscilador que ya había terminado.
   * @returns {void}
   */
  function stop() { if (playing) { try { playing.stop(); } catch (e) {} playing = null; } }

  /* ---------- Interfaz pública ---------- */
  return { CODE, encode, play, stop };
})();
