/**
 * koch.js · Entrenador de Morse con el método Koch: oír una letra y reconocerla al instante.
 *
 * Página: Practicar (/practicar/, sección #morse).
 * Elementos que necesita (practicar/index.html):
 *  - #kochStart     Botón "Empezar". Si no existe, el módulo no hace nada.
 *  - #kochBoard     Panel del ejercicio (oculto hasta pulsar Empezar).
 *  - #kochPrompt    Indicador: "♪" mientras suena, "?" esperando respuesta y la letra correcta al responder.
 *  - #kochRepeat    Botón "Repetir sonido".
 *  - #kochFeedback  Resultado de cada respuesta (debe tener aria-live para que se anuncie).
 *  - #kochKeys      Contenedor donde se pintan los botones de las letras desbloqueadas.
 *  - #kochStats     Línea con letras aprendidas, racha y minutos de hoy.
 *
 * Depende de: morse.js (global Morse: play y CODE) y core.js (Radio.track).
 *
 * Método (inspirado en LCWO, CW Academy y MorseCode.World; razones en docs/DECISIONES.md, D03):
 *  - Velocidad de carácter fija de 20 ppm (WPM): a esa velocidad no da tiempo a contar puntos y rayas, así
 *    que se aprende el SONIDO de cada letra. Un punto dura 1200 / 20 = 60 ms (norma PARIS, ver morse.js).
 *  - Orden de Koch (ORDER): K M U R E S N A P T L W I J Z F O Y V G 5 Q 9 2 H 3 8 B 4 7 C 1 D 6 0 X.
 *    Se empieza con 2 letras (K y M) y se añade una cada vez que se dominan las que hay.
 *  - Regla para desbloquear la siguiente letra (en answer()):
 *      · de las 10 últimas respuestas, al menos 9 aciertos (90 %), y
 *      · la última letra añadida tiene 5 intentos guardados con al menos 4 aciertos.
 *    Al desbloquear se vacía `recent`, para que la nueva letra tenga que demostrarse desde cero.
 *  - La siguiente letra se elige al azar con pesos (pick()): salen más las que fallas, las lentas
 *    (media > 1,5 s), las que tienen pocos intentos y la última añadida. Nunca se repite la misma dos veces seguidas.
 *  - Se mide el tiempo de reacción desde que TERMINA el sonido hasta que se responde.
 *  - Racha de días seguidos practicando y minutos de hoy, con una meta de 15 min al día.
 *
 * Guarda en localStorage, clave "radio.koch" (JSON):
 *  {
 *    level:    número de letras desbloqueadas (2 … 36); journey.js lo lee para "Aprende 6 letras",
 *    hist:     { 'K': [{ ok: true, ms: 840 }, …], … }  solo los 5 últimos intentos de cada letra,
 *    recent:   [true, false, …]  aciertos de las 10 últimas respuestas (de cualquier letra),
 *    streak:   días seguidos practicando,
 *    lastDay:  último día practicado, "AAAA-MM-DD" (en UTC, ver today()),
 *    day:      día al que corresponde todaySec,
 *    todaySec: segundos practicados ese día
 *  }
 * Eventos: emite `radio:progress` (sin detalle) al desbloquear una letra, para que journey.js recalcule.
 *   Hitos de métricas (con Radio.track): 'morse/letras-N' cada 5 letras (N = 5, 10, 15…).
 * No usa servicios externos.
 *
 * Accesibilidad: se responde con el teclado (pulsando la propia letra) o tocando los botones; el resultado
 *   se anuncia por la región aria-live de #kochFeedback. Las teclas se ignoran si se está escribiendo en un
 *   campo de texto o se pulsa con Ctrl/Alt/Cmd, para no robar atajos del navegador.
 *
 * Cómo modificarlo:
 *  - Cambiar la velocidad: WPM (20). Bajarla facilita contar puntos, que es justo lo que el método evita.
 *  - Cambiar los umbrales para desbloquear: las condiciones del `if` bajo "¿desbloquear la siguiente?"
 *    en answer() (10 y 9 de `recent`, 5 y 4 de la letra nueva) y los slice(-10) y slice(-5) que los limitan.
 *  - Cambiar el orden o añadir caracteres: la cadena ORDER (cada carácter debe existir en Morse.CODE).
 *    Ojo: `level` guardado es una posición en ORDER; cambiar el orden cambia qué letras tiene cada persona.
 *  - Cambiar la meta diaria: el 15 de renderKeys().
 */
(() => {
  'use strict';
  if (!document.getElementById('kochStart')) return; // esta página no tiene la sección
  /* ---------- Configuración y estado guardado ---------- */
  const $ = id => document.getElementById(id);
  // Orden de Koch: las primeras son fáciles de distinguir entre sí; la X, última. 36 caracteres.
  const ORDER = 'KMURESNAPTLWIJZFOYVG5Q92H38B47C1D60X'.split('');
  // Velocidad de carácter en palabras por minuto (norma PARIS).
  const WPM = 20;
  const KEY = 'radio.koch';
  /**
   * Fecha de hoy como "AAAA-MM-DD". Usa toISOString, que está en UTC: en España el "día" cambia a la
   * 1:00 o las 2:00 de la madrugada, no a medianoche. Para una racha es suficiente.
   * @returns {string}
   */
  const today = () => new Date().toISOString().slice(0, 10);
  // Estado guardado (forma descrita en la cabecera). Si no hay nada o el JSON está roto, se empieza de cero
  // con 2 letras. localStorage puede lanzar error en modo privado: por eso los try/catch.
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  st = st || { level: 2, hist: {}, recent: [], streak: 0, lastDay: null, todaySec: 0, day: null };
  /**
   * Guarda el estado en localStorage ("radio.koch"). Si falla (cuota, modo privado), se sigue sin guardar.
   * @returns {void}
   */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // Estado de la sesión, no se guarda:
  //  current      letra que está sonando o esperando respuesta;
  //  heardAt      instante (performance.now(), en ms) en que acabó el sonido, para medir la reacción;
  //  busy         true mientras suena algo: bloquea respuestas y repeticiones;
  //  sessionStart instante desde el que se cuentan los segundos de práctica de hoy (ver tickDay()).
  let current = null, heardAt = 0, busy = false, sessionStart = null;

  /* ---------- Estadísticas por letra ---------- */

  /**
   * Letras que la persona ya tiene desbloqueadas: las `st.level` primeras de ORDER.
   * @returns {string[]}
   */
  function unlocked() { return ORDER.slice(0, st.level); }
  /**
   * Últimos intentos guardados de una letra (como mucho 5).
   * @param {string} c Letra.
   * @returns {{ok: boolean, ms: number}[]} Lista vacía si nunca ha salido.
   */
  function stats(c) { return st.hist[c] || []; } // últimos 5: [{ok, ms}]
  /**
   * Proporción de aciertos de una letra en sus últimos intentos.
   * @param {string} c Letra.
   * @returns {number} De 0 a 1 (0 si no hay intentos).
   */
  function acc(c) { const h = stats(c); return h.length ? h.filter(x => x.ok).length / h.length : 0; }

  /* ---------- Elegir la siguiente letra ---------- */

  /**
   * Elige la siguiente letra con un sorteo ponderado (ruleta) entre las desbloqueadas.
   * Peso de cada letra = 1
   *   + 3 por cada fallo en sus 5 últimos intentos (lo que fallas sale mucho más),
   *   + 1 si su tiempo medio de respuesta pasa de 1500 ms (lenta),
   *   + 2 si tiene menos de 3 intentos (aún no hay datos),
   *   + 2 si es la última letra añadida (hay que practicarla para desbloquear la siguiente).
   * Se descarta la letra actual para no repetir; si el sorteo cae en ella, se toma la primera distinta.
   * @returns {string} Letra elegida.
   */
  function pick() {
    const set = unlocked();
    const weights = set.map(c => {
      const h = stats(c), errs = h.filter(x => !x.ok).length;
      const slow = h.length && h.reduce((a, x) => a + x.ms, 0) / h.length > 1500 ? 1 : 0;
      return 1 + errs * 3 + slow + (h.length < 3 ? 2 : 0) + (c === set.at(-1) ? 2 : 0);
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < set.length; i++) { r -= weights[i]; if (r <= 0 && set[i] !== current) return set[i]; }
    return set.find(c => c !== current) || set[0];
  }

  /* ---------- Pintar ---------- */

  /**
   * Pinta un botón por letra desbloqueada, coloreado según su acierto (clase CSS good ≥ 80 %,
   * fair ≥ 50 %, bad por debajo; sin clase si aún no ha salido), y la línea de estadísticas.
   * Las letras son siempre caracteres de ORDER, por eso no hace falta escaparlas.
   * Efectos: reescribe #kochKeys y #kochStats.
   * @returns {void}
   */
  function renderKeys() {
    $('kochKeys').innerHTML = unlocked().map(c => {
      const a = acc(c), h = stats(c).length;
      const cls = !h ? '' : a >= 0.8 ? 'good' : a >= 0.5 ? 'fair' : 'bad';
      return `<button class="kkey ${cls}" data-c="${c}">${c}</button>`;
    }).join('');
    const mins = Math.round(st.todaySec / 60);
    $('kochStats').innerHTML = `Letras: <b>${st.level}/${ORDER.length}</b> · Racha: <b>${st.streak} día${st.streak === 1 ? '' : 's'}</b> · Hoy: <b>${mins} min</b>${mins >= 15 ? ' ✓' : ' de 15'}`;
  }

  /* ---------- Ronda: sonar y responder ---------- */

  /**
   * Elige una letra y la hace sonar. Al terminar el sonido apunta la hora (heardAt) y muestra "?"
   * para indicar que ya se puede responder. No hace nada si ya hay algo sonando.
   * Efectos: audio (Morse.play) y cambios en #kochPrompt y #kochFeedback.
   * @returns {Promise<void>}
   */
  async function next() {
    if (busy) return;
    busy = true;
    current = pick();
    $('kochPrompt').textContent = '♪';
    $('kochFeedback').textContent = '';
    await Morse.play(current, WPM, 650);
    heardAt = performance.now();
    $('kochPrompt').textContent = '?';
    busy = false;
  }

  /**
   * Corrige una respuesta, actualiza las estadísticas, desbloquea letra si toca, guarda y pasa a la siguiente.
   * Solo acepta respuestas cuando #kochPrompt muestra "?" (es decir, después de oír la letra entera).
   * Efectos: modifica `st` y lo guarda, pinta el resultado, puede emitir `radio:progress` y Radio.track,
   *   y programa next() tras 0,5 s si acertaste o 1,3 s si fallaste (para dar tiempo a leer la corrección).
   * @param {string} c Letra respondida, en mayúsculas.
   * @returns {void}
   */
  function answer(c) {
    if (!current || busy || $('kochPrompt').textContent !== '?') return;
    const ms = Math.round(performance.now() - heardAt);
    const ok = c === current;
    // Historial de la letra: se añade este intento y se quedan los 5 últimos. `recent`: los 10 últimos.
    const h = stats(current).concat({ ok, ms }).slice(-5);
    st.hist[current] = h;
    st.recent = st.recent.concat(ok).slice(-10);
    $('kochPrompt').textContent = current;
    // Si fallas, se muestra el código correcto con • y — para que lo compares con lo que oíste.
    $('kochFeedback').innerHTML = ok
      ? `✅ <b>${current}</b> en ${(ms / 1000).toFixed(1)} s${ms < 1000 ? ' ⚡' : ''}`
      : `❌ Era <b>${current}</b> (${Morse.CODE[current].replace(/\./g, '•').replace(/-/g, '—')}), no ${c}`;
    // ¿desbloquear la siguiente?
    const newest = unlocked().at(-1), nh = stats(newest);
    const recentOk = st.recent.length >= 10 && st.recent.filter(Boolean).length >= 9;
    if (st.level < ORDER.length && recentOk && nh.length >= 5 && nh.filter(x => x.ok).length >= 4) {
      st.level++; st.recent = [];
      if (st.level % 5 === 0) Radio.track(`morse/letras-${st.level}`);
      $('kochFeedback').innerHTML += ` · 🎉 Nueva letra: <b>${ORDER[st.level - 1]}</b>`;
      document.dispatchEvent(new CustomEvent('radio:progress'));
    }
    tickDay();
    save(); renderKeys();
    setTimeout(next, ok ? 500 : 1300);
  }

  /* ---------- Racha y tiempo de práctica ---------- */

  /**
   * Lleva la cuenta de días seguidos y de segundos practicados hoy.
   * - Al cambiar de día: si el último día practicado fue ayer, la racha suma 1; si fue otro día anterior,
   *   vuelve a 1; y los segundos de hoy empiezan en 0. (864e5 ms = 24 h, para calcular "ayer".)
   * - Suma a todaySec el tiempo desde la última llamada y reinicia el contador. Se llama al empezar y
   *   tras cada respuesta, así que el tiempo cuenta mientras se está respondiendo, no con la pestaña olvidada
   *   (solo hasta la respuesta siguiente).
   * Efectos: modifica `st` (no guarda; quien llama hace save()).
   * @returns {void}
   */
  function tickDay() {
    const d = today();
    if (st.day !== d) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      st.streak = st.lastDay === y ? st.streak + 1 : st.lastDay === d ? st.streak : 1;
      st.lastDay = d; st.day = d; st.todaySec = 0;
    }
    if (sessionStart) { st.todaySec += (performance.now() - sessionStart) / 1000; sessionStart = performance.now(); }
  }

  /* ---------- Controles ---------- */

  // Empezar: arranca el cronómetro de la sesión, actualiza la racha, muestra el panel y lanza la primera letra.
  $('kochStart').addEventListener('click', () => {
    sessionStart = performance.now();
    tickDay(); save();
    $('kochStart').hidden = true;
    $('kochBoard').hidden = false;
    renderKeys();
    next();
  });
  // Respuesta tocando un botón de letra (un solo escuchador para todos: delegación de eventos).
  $('kochKeys').addEventListener('click', e => { const b = e.target.closest('.kkey'); if (b) answer(b.dataset.c); });
  // Repetir el sonido de la letra actual; vuelve a poner en marcha el cronómetro de reacción.
  $('kochRepeat').addEventListener('click', async () => { if (current && !busy) { busy = true; await Morse.play(current, WPM, 650); heardAt = performance.now(); busy = false; } });
  // Respuesta con el teclado físico: la propia letra o cifra. Solo con el panel visible.
  document.addEventListener('keydown', e => {
    if ($('kochBoard').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const c = e.key.toUpperCase();
    if (unlocked().includes(c)) { e.preventDefault(); answer(c); }
  });
  // Primer pintado (aunque aún no se haya pulsado Empezar) para que se vean las letras y la racha.
  renderKeys();
})();
