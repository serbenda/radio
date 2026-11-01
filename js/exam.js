/**
 * exam.js · Simulador del examen de radioaficionado (estudio con tarjetas, repaso de fallos y simulacro).
 *
 * ── Dónde funciona ────────────────────────────────────────────────────────────────────────────────
 * Página: examen/index.html, sección <section id="test">. Si #test no existe, el módulo no hace nada.
 * Elementos que deben existir en el HTML:
 *   #test        raíz de la sección (también se usa para volver a ella con scroll suave).
 *   #examDash    panel de progreso: termómetro, barras por tema y botones de acción.
 *   #examStage   escenario donde se pintan las tarjetas y el simulacro (empieza oculto con `hidden`).
 * Ids que crea el propio módulo dentro de #examStage: #exBack, #exWhy, #exNext, #exPrev, #exFwd, #exDone.
 *
 * ── Dependencias (cargadas antes en la página) ───────────────────────────────────────────────────
 *   EXAM   (js/exam-data.js)  lista de preguntas { id, p, t, q, a, ok, why }.
 *   Radio  (js/core.js)       Radio.report() para el enlace "¿Crees que esta pregunta tiene un error?"
 *                             y Radio.track para contar el hito del simulacro en GoatCounter.
 *
 * ── Modos ─────────────────────────────────────────────────────────────────────────────────────────
 * 1. Estudio (cajas de Leitner simplificadas): cada pregunta vive en una caja del 0 al 4.
 *      Acierto → sube una caja (como mucho a la 4). Fallo → vuelve a la caja 0.
 *      No hay intervalos de tiempo (no se programan repasos por días): el orden de las tarjetas sale
 *      solo de la caja y de cuántas veces se ha visto cada pregunta (ver nextCard()).
 *      Desde la caja 3 (MASTER) la pregunta cuenta como "dominada": desde cero hacen falta 3 aciertos
 *      seguidos, porque un fallo la devuelve a la 0.
 * 2. Repasar fallos: preguntas falladas alguna vez (wrong > 0) que siguen por debajo de la caja 2.
 *      Al llegar a la caja 2 durante el repaso salen del montón; cuando no queda ninguna, se vuelve al panel.
 * 3. Simulacro: 30 preguntas al azar de cada parte (60 en total), sin corrección hasta el final.
 *      APTO si se acierta al menos la mitad en CADA parte por separado, como en el examen real
 *      (Orden IET/1311/2013; así lo explica también la URE). Al corregir también mueve las cajas.
 *
 * Termómetro ("¿estoy listo?"): % de preguntas dominadas (caja ≥ 3) de cada parte, redondeado.
 *   Se considera "listo" con ≥ 80 % en las dos partes.
 *
 * ── Qué guarda ─────────────────────────────────────────────────────────────────────────────────────
 * localStorage, clave "radio.exam" (JSON). Forma exacta:
 *   {
 *     q:     { "<id de pregunta>": { box: 0..4, wrong: nº de fallos, seen: nº de veces respondida } },
 *     best:  { p1: aciertos parte 1, n1: preguntas parte 1, p2: aciertos parte 2, n2: preguntas parte 2 } | null,
 *     ready: { 1: % dominado parte 1, 2: % dominado parte 2 }
 *   }
 *   - `q` solo tiene las preguntas que se han respondido alguna vez; las demás cuentan como caja 0.
 *   - `best` es el simulacro con más aciertos totales (p1 + p2); null si aún no se ha hecho ninguno.
 *   - `ready` se recalcula y guarda cada vez que se pinta el panel.
 *   Quién más lo lee: journey.js (suma `seen` de `q` y comprueba `ready` ≥ 80 en las dos partes para
 *   "Tu primer mes") y backup.js (copia todas las claves radio.* al archivo de copia de seguridad).
 *   Las claves de `q` son los `id` de exam-data.js: por eso un id nunca debe cambiar.
 *
 * ── Eventos que emite (en document) ───────────────────────────────────────────────────────────────
 *   radio:progress   sin datos; al responder una tarjeta y al corregir un simulacro (journey.js repinta).
 *   radio:mock       detail: { pass: true|false }; al corregir un simulacro.
 *   Además cuenta el hito "examen/simulacro-apto" o "examen/simulacro-no-apto" con Radio.track.
 *
 * ── Cómo modificarlo ──────────────────────────────────────────────────────────────────────────────
 *   - Umbral de "dominada": constante MASTER. El número de cajas (5, de la 0 a la 4) está en los dos
 *     `Math.min(4, …)` y en el texto "caja … de 5" de la tarjeta; cámbialos a la vez.
 *   - Umbral de "listo" (80 %): en renderDash() (cálculo y texto), en journey.js (examReady) y en los
 *     textos de examen/index.html y empezar/index.html (lista de comprobación). Cámbialo en todos.
 *   - Preguntas por parte en el simulacro: el `.slice(0, 30)` de mock(). Si lo subes, tools/check.mjs
 *     exige "n >= 30" por parte y docs/CONTENIDO.md lo menciona: actualiza ambos.
 *   - Nombres de las partes: objeto PARTS. Las partes 1 y 2 están además escritas como [1, 2] en varios sitios.
 *   - No cambies el nombre de la clave "radio.exam" ni de sus campos: se perdería el progreso guardado
 *     y dejarían de funcionar journey.js y las copias de seguridad ya hechas.
 *   - Todo texto de una pregunta pasa por esc() antes de entrar en innerHTML; mantenlo así.
 */
(() => {
  'use strict';
  if (!document.getElementById('test')) return; // esta página no tiene la sección
  /* ---------- Utilidades y estado ---------- */

  /**
   * Atajo de document.getElementById.
   * @param {string} id  Id del elemento, sin '#'.
   * @returns {HTMLElement|null}
   */
  const $ = id => document.getElementById(id);
  /**
   * Escapa los cinco caracteres especiales de HTML para insertar texto en innerHTML sin riesgo.
   * Copia local de Radio.esc, para que este módulo no dependa de él al pintar.
   * @param {*} s  Texto (se convierte a cadena).
   * @returns {string} Texto seguro para HTML.
   */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /**
   * Devuelve una COPIA barajada del array (no modifica el original).
   * Asigna a cada elemento un número aleatorio y ordena por él; suficiente para barajar opciones y preguntas.
   * @template T
   * @param {T[]} a
   * @returns {T[]}
   */
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const KEY = 'radio.exam';
  /**
   * Lee el estado guardado en localStorage.
   * @returns {Object} El objeto guardado, o {} si no hay nada, el JSON está roto o localStorage no está
   *   disponible (modo privado, almacenamiento bloqueado).
   */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  /**
   * Guarda el estado completo `st` en localStorage. Si falla (cuota llena, modo privado) se ignora:
   * la web sigue funcionando, solo que el progreso no se conserva al recargar.
   * @returns {void}
   */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  // Estado en memoria: es el mismo objeto que se guarda con save(). Se completa con valores por defecto.
  const st = load();
  st.q = st.q || {};      // id → { box: 0..4, wrong, seen }
  st.best = st.best || null;
  // Nombre de cada parte del examen, tal como se muestra en el termómetro.
  const PARTS = { 1: 'Electricidad y radioelectricidad', 2: 'Normativa y operación' };
  const MASTER = 3;       // caja a partir de la cual se considera dominada
  /**
   * Progreso de una pregunta. Si nunca se ha respondido devuelve un objeto nuevo en caja 0
   * (que no se guarda hasta que se responda).
   * @param {string} id  Id de la pregunta (campo `id` de EXAM).
   * @returns {{box:number, wrong:number, seen:number}}
   */
  const info = id => st.q[id] || { box: 0, wrong: 0, seen: 0 };

  /* ---------- Panel de progreso ---------- */
  /**
   * Termómetro de una parte: porcentaje de sus preguntas que están dominadas (caja ≥ MASTER).
   * Fórmula: round(dominadas / total de la parte × 100). Las preguntas nunca vistas cuentan como no dominadas.
   * @param {1|2} p  Parte del examen.
   * @returns {number} Entero de 0 a 100.
   */
  function readiness(p) {
    const qs = EXAM.filter(q => q.p === p);
    return Math.round(qs.filter(q => info(q.id).box >= MASTER).length / qs.length * 100);
  }
  /**
   * Pinta el panel de progreso en #examDash: termómetro de las dos partes, barra de cada tema,
   * botones de estudio/repaso/simulacro y el mejor simulacro.
   * Efectos: guarda `st.ready` en localStorage (journey.js lo lee desde la portada) y sustituye el
   * contenido de #examDash. Se llama al cargar y cada vez que se vuelve al panel.
   * @returns {void}
   */
  function renderDash() {
    const r1 = readiness(1), r2 = readiness(2), ready = r1 >= 80 && r2 >= 80;
    st.ready = { 1: r1, 2: r2 }; save(); // journey.js lo lee desde la portada
    // Temas en el orden en que aparecen por primera vez en EXAM (un tema nuevo en exam-data.js sale solo aquí).
    const topics = [...new Set(EXAM.map(q => q.t))];
    // Mismo criterio que el botón "Repasar mis fallos": falladas alguna vez y todavía por debajo de la caja 2.
    const wrongs = EXAM.filter(q => info(q.id).wrong > 0 && info(q.id).box < 2).length;
    $('examDash').innerHTML = `
      <div class="thermo">
        ${[1, 2].map(p => { const r = p === 1 ? r1 : r2; return `<div class="th"><span>Parte ${p} · ${PARTS[p]}</span><div class="bar" role="progressbar" aria-label="Preparación de la parte ${p}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r}"><i style="width:${r}%"></i></div><b>${r}%</b></div>`; }).join('')}
        <p class="th-verdict ${ready ? 'ok' : ''}">${ready ? '🎉 Estás listo: haz un simulacro para comprobarlo.' : 'Llega al 80 % en las dos partes estudiando con tarjetas; entonces haz el simulacro.'}</p>
      </div>
      <div class="topics">${topics.map(t => {
        const qs = EXAM.filter(q => q.t === t), m = qs.filter(q => info(q.id).box >= MASTER).length;
        return `<div class="tp"><span>${t}</span><div class="bar small"><i style="width:${Math.round(m / qs.length * 100)}%"></i></div><small>${m}/${qs.length}</small></div>`;
      }).join('')}</div>
      <div class="exam-actions">
        <button class="btn" data-go="study1">📚 Estudiar parte 1</button>
        <button class="btn" data-go="study2">📚 Estudiar parte 2</button>
        <button class="btn ghost" data-go="errors" ${wrongs ? '' : 'disabled'}>🔁 Repasar mis fallos (${wrongs})</button>
        <button class="btn ghost" data-go="mock">⏱️ Simulacro completo</button>
      </div>
      ${st.best ? `<p class="note">Tu mejor simulacro: parte 1 ${st.best.p1}/${st.best.n1} · parte 2 ${st.best.p2}/${st.best.n2}.</p>` : ''}`;
  }

  /* ---------- Estudio adaptativo ---------- */
  /* ---------- Estudio adaptativo ---------- */

  // pool: preguntas de la sesión de estudio actual. last: la última mostrada, para no repetirla seguida.
  let pool = [], last = null;
  /**
   * Elige la siguiente tarjeta del montón `pool` (selección de tipo Leitner).
   * Criterio, en este orden:
   *   1. Nunca la misma que la anterior (salvo que solo quede una).
   *   2. La caja más baja primero: lo que menos se sabe sale antes.
   *   3. Dentro de esa caja, lo menos visto (`seen` menor).
   *   4. Entre las 4 primeras de esa caja según ese orden, una al azar, para que el orden no sea siempre el mismo.
   * @returns {Object|null} Pregunta de EXAM, o null si el montón está vacío (fin del repaso de fallos).
   */
  function nextCard() {
    if (!pool.length) return null;
    // prioriza las cajas bajas; dentro de la caja, lo menos visto; evita repetir la anterior
    const rest = pool.filter(q => q !== last);
    if (!rest.length) return pool[0];
    // Ordena por caja, luego por veces vista y, si empatan, al azar. `rest` es una copia (filter), así que
    // ordenar no altera `pool`.
    const sorted = rest.sort((a, b) => (info(a.id).box - info(b.id).box) || (info(a.id).seen - info(b.id).seen) || (Math.random() - 0.5));
    const lowest = info(sorted[0].id).box;
    // `same`: las de la caja más baja, ya ordenadas por `seen`. Se sortea entre las min(nº, 4) primeras.
    const same = sorted.filter(q => info(q.id).box === lowest);
    return same[Math.floor(Math.random() * Math.min(same.length, 4))] || sorted[0] || last;
  }
  /**
   * Abre una sesión de estudio con tarjetas: una pregunta cada vez, corrección inmediata y explicación.
   * Oculta el panel y muestra #examStage. Cada respuesta actualiza la caja de la pregunta y se guarda al momento.
   * @param {Object[]} questions  Preguntas de EXAM que forman el montón (una parte entera o los fallos).
   * @param {string} title        Texto de la barra superior ('Parte 1', 'Parte 2', 'Tus fallos').
   * @returns {void}
   * Efectos: escribe en localStorage y emite `radio:progress` tras cada respuesta.
   */
  function study(questions, title) {
    pool = questions; last = null;
    $('examDash').hidden = true; $('examStage').hidden = false;
    // Marcador de esta sesión (no se guarda): respondidas y acertadas.
    let n = 0, hits = 0;
    /**
     * Pinta la siguiente tarjeta y prepara la respuesta. Si no quedan tarjetas, vuelve al panel.
     * Las opciones se barajan, pero cada botón guarda en data-i su índice original en `q.a`
     * para compararlo con `q.ok`.
     * @returns {void}
     */
    const card = () => {
      const q = nextCard();
      if (!q) { back(); return; }
      last = q;
      const opts = shuffle(q.a.map((a, i) => ({ a, i })));
      $('examStage').innerHTML = `
        <div class="ex-top"><button class="btn small ghost" id="exBack">← Volver</button><span>${title} · ${hits}/${n} acertadas</span></div>
        <p class="ex-topic">${q.t} · caja ${info(q.id).box + 1} de 5</p>
        <h3 class="ex-q">${esc(q.q)}</h3>
        <div class="ex-opts">${opts.map(o => `<button class="opt wide" data-i="${o.i}">${esc(o.a)}</button>`).join('')}</div>
        <div class="ex-why" id="exWhy"></div>`;
      $('exBack').onclick = back;
      // Un solo manejador para todas las opciones (delegación). Tras responder se desactivan los botones,
      // así que un segundo clic no cuenta dos veces.
      $('examStage').querySelector('.ex-opts').onclick = e => {
        const b = e.target.closest('.opt'); if (!b || b.disabled) return;
        const ok = +b.dataset.i === q.ok, s = info(q.id);
        s.seen++; n++;
        // Regla de Leitner: acierto → una caja más (tope 4); fallo → caja 0 y un fallo más en el historial.
        if (ok) { hits++; s.box = Math.min(4, s.box + 1); } else { s.wrong++; s.box = 0; }
        st.q[q.id] = s; save();
        $('examStage').querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.i === q.ok) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('exWhy').innerHTML = `<p><b>${ok ? '✅ Correcto.' : '❌ No era esa.'}</b> ${esc(q.why)}</p><button class="btn small" id="exNext">Siguiente →</button><a class="ex-report" href="${Radio.report('pregunta-examen', { pregunta: q.id }, `[Examen] Pregunta ${q.id}`)}" target="_blank" rel="noopener">¿Crees que esta pregunta tiene un error?</a>`;
        $('exNext').onclick = card; $('exNext').focus();
        // En "Repasar mis fallos", la pregunta sale del montón al llegar a la caja 2 (deja de contar como fallo).
        // Se compara la referencia del array: solo errPool es el montón de fallos.
        if (questions === errPool && s.box >= 2) pool = pool.filter(x => x !== q);
        document.dispatchEvent(new CustomEvent('radio:progress'));
      };
    };
    card();
  }

  /* ---------- Simulacro ---------- */
  /* ---------- Simulacro ---------- */

  /**
   * Simulacro completo: 30 preguntas al azar de cada parte (primero la parte 1, luego la 2),
   * sin corrección hasta el final. Se puede ir adelante y atrás y cambiar la respuesta.
   * Al terminar llama a grade(). Una pregunta sin contestar cuenta como fallo.
   * El simulador usa 30 por parte por decisión propia; el aprobado sigue la regla del examen real
   * (mitad de aciertos en cada parte).
   * @returns {void}
   */
  function mock() {
    const parts = [1, 2].map(p => shuffle(EXAM.filter(q => q.p === p)).slice(0, 30));
    // Cada elemento: la pregunta, sus opciones ya barajadas (fijas durante todo el simulacro) y lo elegido.
    const list = [...parts[0], ...parts[1]].map(q => ({ q, opts: shuffle(q.a.map((a, i) => ({ a, i }))), pick: null }));
    let i = 0;
    $('examDash').hidden = true; $('examStage').hidden = false;
    /**
     * Pinta la pregunta número `i` del simulacro, marcando la opción elegida si ya la había.
     * @returns {void}
     */
    const show = () => {
      const it = list[i];
      $('examStage').innerHTML = `
        <div class="ex-top"><button class="btn small ghost" id="exBack">✕ Abandonar</button><span>Simulacro · pregunta ${i + 1} de ${list.length} · parte ${it.q.p}</span></div>
        <div class="ex-progress"><i style="width:${(i / list.length) * 100}%"></i></div>
        <h3 class="ex-q">${esc(it.q.q)}</h3>
        <div class="ex-opts">${it.opts.map(o => `<button class="opt wide${it.pick === o.i ? ' picked' : ''}" data-i="${o.i}">${esc(o.a)}</button>`).join('')}</div>
        <div class="row"><button class="btn small ghost" id="exPrev" ${i ? '' : 'disabled'}>← Anterior</button>
        <button class="btn small" id="exFwd">${i === list.length - 1 ? 'Terminar y corregir' : 'Siguiente →'}</button></div>`;
      $('exBack').onclick = back;
      $('exPrev').onclick = () => { i--; show(); };
      $('exFwd').onclick = () => { if (i === list.length - 1) grade(); else { i++; show(); } };
      $('examStage').querySelector('.ex-opts').onclick = e => {
        const b = e.target.closest('.opt'); if (!b) return;
        it.pick = +b.dataset.i;
        $('examStage').querySelectorAll('.opt').forEach(x => x.classList.toggle('picked', x === b));
      };
    };
    /**
     * Corrige el simulacro y muestra APTO / NO APTO con la lista de fallos.
     * Efectos:
     *   - Mueve las cajas de las 60 preguntas con la misma regla que el estudio (acierto +1, fallo → 0).
     *   - Guarda `best` si el total de aciertos supera al mejor anterior.
     *   - Emite `radio:progress` y `radio:mock` ({ pass }) y cuenta el hito con Radio.track.
     * @returns {void}
     */
    const grade = () => {
      const res = [1, 2].map(p => { const qs = list.filter(x => x.q.p === p); return { n: qs.length, ok: qs.filter(x => x.pick === x.q.ok).length }; });
      list.forEach(x => { const s = info(x.q.id); if (x.pick === x.q.ok) s.box = Math.min(4, s.box + 1); else { s.wrong++; s.box = 0; } s.seen++; st.q[x.q.id] = s; });
      // Aprobado como en el examen real: al menos la mitad de aciertos en CADA parte (15 de 30).
      // Una parte muy buena no compensa la otra.
      const pass = res.every(r => r.ok >= r.n / 2);
      // "Mejor simulacro" = más aciertos totales; -1 hace que el primer simulacro siempre se guarde.
      const prev = st.best ? st.best.p1 + st.best.p2 : -1;
      if (res[0].ok + res[1].ok > prev) st.best = { p1: res[0].ok, n1: res[0].n, p2: res[1].ok, n2: res[1].n };
      save();
      const wrong = list.filter(x => x.pick !== x.q.ok);
      $('examStage').innerHTML = `
        <div class="ex-result ${pass ? 'ok' : ''}">
          <p class="big">${pass ? 'APTO' : 'NO APTO'}</p>
          <p>Parte 1: <b>${res[0].ok}/${res[0].n}</b> · Parte 2: <b>${res[1].ok}/${res[1].n}</b></p>
          <p class="note">Se aprueba con la mitad de aciertos en cada parte, como en el examen real.</p>
          <button class="btn" id="exDone">Volver al panel</button>
        </div>
        ${wrong.length ? `<h3 class="ex-rev">Repasa tus fallos</h3><ol class="ex-wrong">${wrong.map(x => `<li><b>${esc(x.q.q)}</b><br>Correcta: ${esc(x.q.a[x.q.ok])}. <span>${esc(x.q.why)}</span></li>`).join('')}</ol>` : ''}`;
      $('exDone').onclick = back;
      document.dispatchEvent(new CustomEvent('radio:progress'));
      document.dispatchEvent(new CustomEvent('radio:mock', { detail: { pass } }));
      Radio.track(`examen/simulacro-${pass ? 'apto' : 'no-apto'}`);
    };
    show();
  }

  /* ---------- Navegación entre panel y escenario ---------- */

  // Montón del repaso de fallos. Se fija al pulsar el botón y study() lo compara por referencia.
  let errPool = [];
  /**
   * Vuelve al panel: oculta #examStage, muestra #examDash, lo repinta con el progreso nuevo
   * y desplaza la vista al principio de la sección.
   * @returns {void}
   */
  function back() { $('examStage').hidden = true; $('examDash').hidden = false; renderDash(); $('test').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  // Botones del panel (atributo data-go): estudiar una parte, repasar fallos o empezar un simulacro.
  $('examDash').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const go = b.dataset.go;
    if (go === 'study1') study(EXAM.filter(q => q.p === 1), 'Parte 1');
    if (go === 'study2') study(EXAM.filter(q => q.p === 2), 'Parte 2');
    // El montón de fallos se calcula en el momento del clic, con el mismo criterio que el contador del botón.
    if (go === 'errors') { errPool = EXAM.filter(q => info(q.id).wrong > 0 && info(q.id).box < 2); study(errPool, 'Tus fallos'); }
    if (go === 'mock') mock();
  });
  renderDash();
})();
