/**
 * journey.js · "Tu primer mes": ruta de 4 semanas que se completa sola según lo que haces en la web.
 *
 * Páginas: TODAS (registra logros en cualquier página). Solo pinta la ruta donde existe #weeks (Inicio).
 * Carga: después de core.js y data.js y antes de los módulos de la página, para estar ya escuchando
 * cuando estos emitan sus eventos.
 * Elementos (solo en la portada): #weeks (lista de semanas), #journeyBar (relleno de la barra; su padre
 *   tiene role="progressbar" y aquí se actualiza su aria-valuenow), #journeyMeta (resumen en texto),
 *   #journeyShare (botón compartir, oculto hasta el primer paso) y #journeyReset (empezar de cero).
 * Depende de: Radio ($, store, url, emit, track) de core.js.
 *
 * Cómo se entera de lo que haces:
 *  - Escucha el evento `radio:event` ({ name, id }) que emiten los demás módulos con Radio.emit():
 *      station  → stations.js, al reproducir una emisora (id = emisora)
 *      websdr   → este módulo, al hacer clic en cualquier enlace a un receptor web real
 *      sound    → sounds.js, al reproducir un sonido (id = sonido); recordings.js, al reproducir una grabación
 *      prop     → propagation.js, al tocar una banda del semáforo para ver qué significa
 *      live     → live.js, al filtrar por banda o abrir un aviso para escucharlo
 *      iss      → iss.js, al cambiar de ciudad o usar tu ubicación para calcular pases
 *  - Escucha `radio:qso` (qso.js, { scenario }) y `radio:mock` (exam.js, { pass }).
 *  - Escucha `radio:progress` (sin datos): solo repinta, porque el dato ya lo ha guardado otro módulo.
 *  - Lee lo que otros módulos ya guardan: radio.lessons, radio.koch, radio.exam, radio.checklist.
 *    Solo los lee; nunca los escribe.
 *
 * Guarda en localStorage → "radio.journey":
 *   { since: fecha de inicio, ev: { nombre: [ids únicos] }, badges: { índiceSemana: fecha } }
 *   - since   {number}  Milisegundos desde 1970 (Date.now()) del primer uso: sirve para "día N de tu ruta".
 *   - ev      {Object<string, Array>}  Por cada tipo de logro ('station', 'sound', 'qso', 'apto'…), la lista
 *             de ids distintos conseguidos. En 'apto' cada simulacro aprobado añade su fecha (no se deduplica).
 *   - badges  {Object<string, number>}  Índice de semana (0-3) → fecha en que se ganó la insignia.
 * Métricas: Radio.track('insignia/semana-<n>') la primera vez que se gana cada insignia.
 *
 * Diseño: un paso solo cuenta si la persona HACE algo (pulsar, escuchar, responder), nunca por
 * desplazarse por la página. Ver docs/MODULOS.md y docs/DECISIONES.md (D08).
 * Accesibilidad: cada paso dice "(hecho)" o "(pendiente)" en texto oculto para lectores de pantalla;
 *   la insignia nueva se anuncia con un aviso role="status".
 *
 * Cómo modificarlo:
 *  - Añadir un paso: nueva entrada en `tasks` de su semana en WEEKS. `done` es una función que devuelve
 *    true cuando el paso está hecho; `prog` (opcional) devuelve el texto "n/total" que se ve mientras no lo está.
 *  - Paso basado en una acción nueva: haz que su módulo llame a Radio.emit('nombre', id) cuando la persona
 *    actúe, y aquí usa count('nombre') en `done`. Añade el nombre a la lista de esta cabecera.
 *  - Paso basado en lo que guarda otro módulo: añade una función de lectura junto a lessons()/koch()…
 *    y haz que ese módulo dispare `radio:progress` al guardar, para que la ruta se repinte.
 *  - Cambiar textos o insignias: campos `name`, `badge` y `text` de WEEKS (los textos van tal cual a innerHTML).
 */
(() => {
  'use strict';
  const { $, store, url } = Radio;
  const KEY = 'radio.journey';
  // Estado completo de la ruta (forma descrita en la cabecera). Si no hay nada guardado, empieza hoy.
  let st = store.get(KEY) || { since: Date.now(), ev: {}, badges: {} };
  /** Guarda el estado `st` en localStorage. */
  const save = () => store.set(KEY, st);
  /**
   * Lista de ids conseguidos para un tipo de logro; la crea vacía si no existía (por eso modifica `st`).
   * @param {string} name  Tipo de logro ('station', 'qso'…).
   * @returns {Array} La propia lista guardada en st.ev (añadir a ella cambia el estado).
   */
  const list = name => (st.ev[name] = st.ev[name] || []);
  /**
   * Cuántos ids distintos hay de un tipo de logro, sin crear la lista si no existe.
   * @param {string} name  Tipo de logro.
   * @returns {number}
   */
  const count = name => (st.ev[name] || []).length;

  /* ---------- Lecturas de lo que guardan los demás módulos ---------- */
  // Si la forma de esas claves cambia en su módulo, hay que cambiar también estas funciones.

  /** @returns {number} Lecciones completadas: valores verdaderos de radio.lessons ({ idLección: true }). */
  const lessons = () => Object.values(store.get('radio.lessons', {})).filter(Boolean).length;
  /** @returns {number} Nivel del entrenador Koch (radio.koch.level), que equivale al número de letras aprendidas. */
  const koch = () => store.get('radio.koch', {}).level || 0;
  /** @returns {number} Tarjetas del examen respondidas: suma de `seen` de cada pregunta en radio.exam.q. */
  const examSeen = () => Object.values(store.get('radio.exam', {}).q || {}).reduce((a, x) => a + (x.seen || 0), 0);
  /**
   * @returns {boolean} true si el termómetro del examen está al 80 % o más en las partes 1 y 2
   *   (radio.exam.ready = { parte: porcentaje }). Es el mismo umbral que desbloquea el simulacro (D04).
   */
  const examReady = () => { const r = store.get('radio.exam', {}).ready || {}; return (r[1] || 0) >= 80 && (r[2] || 0) >= 80; };
  /**
   * @param {string} k  Id de un paso de la lista del trámite (checklist.js), p. ej. 'club'.
   * @returns {boolean} true si ese paso está marcado en radio.checklist.
   */
  const checklist = k => !!store.get('radio.checklist', {})[k];

  /* ---------- La ruta: semanas y pasos ---------- */
  /**
   * Las cuatro semanas. Cada una:
   *  - name  {string}  Título visible.
   *  - badge {string}  Insignia que se gana al completar todos sus pasos.
   *  - tasks {Array}   Pasos: { text, href, done, prog? }
   *      text {string}   Qué hay que hacer.
   *      href {string}   Dónde se hace, relativo a la raíz del sitio (se pasa por Radio.url).
   *      done {Function} () => boolean: ¿está hecho? Se evalúa cada vez que se repinta.
   *      prog {Function} (opcional) () => 'n/total': progreso parcial que se muestra si no está hecho.
   * El índice de la semana en esta lista es la clave de st.badges: no reordenes semanas o se mezclarán insignias.
   */
  const WEEKS = [
    { name: 'Semana 1 · Escuchar', badge: '👂 Oyente', tasks: [
      { text: 'Escucha 3 emisoras distintas del mapa', href: 'escuchar/#emisoras', done: () => count('station') >= 3, prog: () => `${Math.min(3, count('station'))}/3` },
      { text: 'Abre un receptor real de onda corta', href: 'escuchar/#directo', done: () => count('websdr') >= 1 },
      { text: 'Escucha y mira 4 sonidos en la cascada', href: 'escuchar/#sonidos', done: () => count('sound') >= 4, prog: () => `${Math.min(4, count('sound'))}/4` },
    ] },
    { name: 'Semana 2 · Entender', badge: '🤓 Curioso', tasks: [
      { text: 'Completa 2 lecciones de “Cómo funciona”', href: 'entender/#como-funciona', done: () => lessons() >= 2, prog: () => `${Math.min(2, lessons())}/2` },
      { text: 'Toca una banda en la propagación de hoy para ver qué significa', href: 'entender/#propagacion', done: () => count('prop') >= 1 },
      { text: 'Filtra el mapa “Ahora en el aire” o abre un aviso', href: 'escuchar/#ahora', done: () => count('live') >= 1 },
      { text: 'Aprende 6 letras con el entrenador Koch', href: 'practicar/#morse', done: () => koch() >= 6, prog: () => `${Math.min(6, koch())}/6` },
    ] },
    { name: 'Semana 3 · Practicar', badge: '🎙️ Operador', tasks: [
      { text: 'Haz tu primer contacto simulado', href: 'practicar/#qso', done: () => (st.ev.qso || []).includes('primero') },
      { text: 'Prueba 3 tipos de contacto distintos', href: 'practicar/#qso', done: () => count('qso') >= 3, prog: () => `${Math.min(3, count('qso'))}/3` },
      { text: 'Responde 50 tarjetas del examen', href: 'examen/', done: () => examSeen() >= 50, prog: () => `${Math.min(50, examSeen())}/50` },
    ] },
    { name: 'Semana 4 · Dar el salto', badge: '📻 Casi radioaficionado', tasks: [
      { text: 'Lleva el termómetro del examen al 80 %', href: 'examen/', done: examReady },
      { text: 'Saca APTO en un simulacro', href: 'examen/', done: () => count('apto') >= 1 },
      { text: 'Calcula cuándo pasa la ISS sobre tu ciudad', href: 'entender/#iss', done: () => count('iss') >= 1 },
      { text: 'Contacta con un radioclub', href: 'empezar/#clubes', done: () => checklist('club') },
    ] },
  ];

  /* ---------- Registro de logros (en todas las páginas) ---------- */
  /**
   * Logro genérico (Radio.emit). Añade el id a la lista de su tipo si no estaba, guarda y repinta.
   * Sin id se genera uno nuevo ('x0', 'x1'…) para que cada llamada cuente.
   */
  document.addEventListener('radio:event', e => {
    const { name, id } = e.detail || {};
    if (!name) return;
    const l = list(name), key = id || 'x' + l.length;
    if (!l.includes(key)) l.push(key);
    save(); render();
  });
  // Contacto simulado terminado: se guarda el tipo de escenario ('primero', 'concurso'…) en ev.qso, sin repetir.
  document.addEventListener('radio:qso', e => { const l = list('qso'), s = e.detail && e.detail.scenario; if (s && !l.includes(s)) l.push(s); save(); render(); });
  // Simulacro corregido: solo los aprobados ({ pass: true }) se apuntan en ev.apto, con su fecha.
  document.addEventListener('radio:mock', e => { if (e.detail && e.detail.pass) { list('apto').push(Date.now()); save(); } render(); });
  document.addEventListener('radio:progress', () => render());
  // Cualquier enlace a un receptor web real, esté en la página que esté
  // Se escucha en `document` (delegación) para cubrir también los enlaces que otros módulos pintan después.
  // El id del logro es la URL completa, así que abrir el mismo receptor dos veces cuenta una sola vez.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="websdr"], a[href*="kiwisdr"], a[href*="linkfanel"]');
    if (a) Radio.emit('websdr', a.href);
  });

  /* ---------- Pintado (solo en la portada) ---------- */
  const weeksEl = $('weeks');
  /**
   * Repinta la ruta completa: semanas, pasos, barra de progreso y resumen.
   * Fuera de la portada (#weeks no existe) no hace nada.
   * Efectos: reescribe #weeks, el ancho de #journeyBar, aria-valuenow de su padre, #journeyMeta y la
   *   visibilidad de #journeyShare. Si una semana acaba de completarse, apunta la fecha en st.badges,
   *   guarda, muestra el aviso de insignia y cuenta el hito en GoatCounter (solo la primera vez).
   */
  function render() {
    if (!weeksEl) return;
    let total = 0, done = 0;
    weeksEl.innerHTML = WEEKS.map((w, wi) => {
      const ok = w.tasks.map(t => t.done());
      total += ok.length; done += ok.filter(Boolean).length;
      const full = ok.every(Boolean);
      if (full && !st.badges[wi]) { st.badges[wi] = Date.now(); save(); celebrate(w.badge); Radio.track(`insignia/semana-${wi + 1}`); }
      return `<div class="week${full ? ' full' : ''}">
        <h3>${w.name}</h3>
        <ul>${w.tasks.map((t, i) => `<li class="${ok[i] ? 'ok' : ''}"><span class="tick" aria-hidden="true">${ok[i] ? '✓' : ''}</span><a href="${url(t.href)}">${t.text}<span class="sr-only">${ok[i] ? ' (hecho)' : ' (pendiente)'}</span></a>${!ok[i] && t.prog ? `<small>${t.prog()}</small>` : ''}</li>`).join('')}</ul>
        <p class="badge${full ? ' won' : ''}">${full ? 'Insignia: ' : 'Al terminar: '}<b>${w.badge}</b></p>
      </div>`;
    }).join('');
    const pct = Math.round(done / total * 100);
    $('journeyBar').style.width = pct + '%';
    $('journeyBar').parentElement.setAttribute('aria-valuenow', String(pct));
    // 864e5 = 86.400.000 ms = un día. Se suma 1 para que el primer día sea "día 1".
    const day = Math.floor((Date.now() - st.since) / 864e5) + 1;
    $('journeyMeta').innerHTML = `<b>${done}</b> de ${total} pasos · <b>${pct}%</b> · día ${day} de tu ruta`;
    $('journeyShare').hidden = done === 0;
  }

  /**
   * Muestra durante unos segundos un aviso flotante ("toast") de insignia nueva.
   * @param {string} badge  Texto de la insignia (de WEEKS; contenido propio, por eso no se escapa).
   * Efectos: añade un <div class="toast" role="status"> al final de <body> y lo quita solo.
   * Tiempos: la clase "show" se añade a los 20 ms (para que la transición CSS se vea al entrar),
   *   se quita a los 3,5 s y el elemento se borra 400 ms después, cuando ha terminado la transición de salida.
   */
  function celebrate(badge) {
    const t = document.createElement('div');
    // role="status": los lectores de pantalla lo anuncian sin interrumpir lo que estén leyendo.
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `🎉 ¡Nueva insignia! <b>${badge}</b>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }

  /* ---------- Botones de la portada ---------- */
  if (weeksEl) {
    /**
     * Compartir mi progreso: texto con el resumen y las insignias ganadas.
     * Usa el menú nativo de compartir si existe (móvil); si no, copia texto + enlace al portapapeles
     * y muestra "✅ Copiado" durante 2,5 s. Nada se envía a ningún servidor de la web.
     */
    $('journeyShare').addEventListener('click', async () => {
      const badges = WEEKS.filter((w, i) => st.badges[i]).map(w => w.badge).join(' ');
      const text = `📻 Estoy aprendiendo radioafición: ${$('journeyMeta').textContent}${badges ? ' · ' + badges : ''}. ¿Te apuntas?`;
      const link = 'https://bendi.dev/radio/#mes';
      if (navigator.share) { try { await navigator.share({ text, url: link }); } catch (e) { /* cancelado */ } return; }
      try { await navigator.clipboard.writeText(text + ' ' + link); $('journeyShare').textContent = '✅ Copiado'; setTimeout(() => { $('journeyShare').textContent = '📤 Compartir mi progreso'; }, 2500); } catch (e) { /* sin portapapeles */ }
    });
    /**
     * Empezar de cero: tras confirmar, borra SOLO radio.journey (logros e insignias) y repinta.
     * El progreso del examen, del Morse, de las lecciones y de la lista del trámite se conserva,
     * así que los pasos que dependen de ellos pueden volver a salir hechos.
     */
    $('journeyReset').addEventListener('click', () => {
      if (!confirm('¿Empezar la ruta desde cero? Se borra el progreso de la ruta (no el del examen ni el de Morse).')) return;
      st = { since: Date.now(), ev: {}, badges: {} }; save(); render();
    });
    render();
  }
})();
