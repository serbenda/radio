/**
 * exam.js · Simulador del examen de radioaficionado.
 *
 * Página: Examen (#test). Necesita: #examDash, #examStage. Datos: EXAM (exam-data.js).
 *
 * Estudio (cajas de Leitner): cada pregunta está en una caja del 0 al 4. Acertar la sube una caja; fallar la
 * devuelve a la 0. Se pregunta antes lo de las cajas bajas y lo menos visto. Desde la caja 3 cuenta como dominada.
 * Termómetro: % de preguntas dominadas por parte; "listo" con ≥ 80 % en las dos.
 * Repasar fallos: preguntas falladas alguna vez que siguen por debajo de la caja 2.
 * Simulacro: 30 preguntas por parte al azar, sin correcciones hasta el final; APTO con la mitad de aciertos
 * en cada parte, como el examen real (según la URE). Al corregir también mueve las cajas.
 *
 * Guarda en localStorage → "radio.exam": { q: { id: { box, wrong, seen } }, best: mejor simulacro,
 *   ready: { 1: %, 2: % } } (journey.js lee `q` y `ready`).
 * Eventos: `radio:progress` al responder y `radio:mock` ({ pass }) al corregir un simulacro.
 */
(() => {
  'use strict';
  if (!document.getElementById('test')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const KEY = 'radio.exam';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const st = load();
  st.q = st.q || {};      // id → { box: 0..4, wrong, seen }
  st.best = st.best || null;
  const PARTS = { 1: 'Electricidad y radioelectricidad', 2: 'Normativa y operación' };
  const MASTER = 3;       // caja a partir de la cual se considera dominada
  const info = id => st.q[id] || { box: 0, wrong: 0, seen: 0 };

  /* ---------- Panel de progreso ---------- */
  function readiness(p) {
    const qs = EXAM.filter(q => q.p === p);
    return Math.round(qs.filter(q => info(q.id).box >= MASTER).length / qs.length * 100);
  }
  function renderDash() {
    const r1 = readiness(1), r2 = readiness(2), ready = r1 >= 80 && r2 >= 80;
    st.ready = { 1: r1, 2: r2 }; save(); // journey.js lo lee desde la portada
    const topics = [...new Set(EXAM.map(q => q.t))];
    const wrongs = EXAM.filter(q => info(q.id).wrong > 0 && info(q.id).box < 2).length;
    $('examDash').innerHTML = `
      <div class="thermo">
        ${[1, 2].map(p => { const r = p === 1 ? r1 : r2; return `<div class="th"><span>Parte ${p} · ${PARTS[p]}</span><div class="bar"><i style="width:${r}%"></i></div><b>${r}%</b></div>`; }).join('')}
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
  let pool = [], last = null;
  function nextCard() {
    if (!pool.length) return null;
    // prioriza las cajas bajas; dentro de la caja, lo menos visto; evita repetir la anterior
    const rest = pool.filter(q => q !== last);
    if (!rest.length) return pool[0];
    const sorted = rest.sort((a, b) => (info(a.id).box - info(b.id).box) || (info(a.id).seen - info(b.id).seen) || (Math.random() - 0.5));
    const lowest = info(sorted[0].id).box;
    const same = sorted.filter(q => info(q.id).box === lowest);
    return same[Math.floor(Math.random() * Math.min(same.length, 4))] || sorted[0] || last;
  }
  function study(questions, title) {
    pool = questions; last = null;
    $('examDash').hidden = true; $('examStage').hidden = false;
    let n = 0, hits = 0;
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
      $('examStage').querySelector('.ex-opts').onclick = e => {
        const b = e.target.closest('.opt'); if (!b || b.disabled) return;
        const ok = +b.dataset.i === q.ok, s = info(q.id);
        s.seen++; n++;
        if (ok) { hits++; s.box = Math.min(4, s.box + 1); } else { s.wrong++; s.box = 0; }
        st.q[q.id] = s; save();
        $('examStage').querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.i === q.ok) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('exWhy').innerHTML = `<p><b>${ok ? '✅ Correcto.' : '❌ No era esa.'}</b> ${esc(q.why)}</p><button class="btn small" id="exNext">Siguiente →</button>`;
        $('exNext').onclick = card; $('exNext').focus();
        if (questions === errPool && s.box >= 2) pool = pool.filter(x => x !== q);
        document.dispatchEvent(new CustomEvent('radio:progress'));
      };
    };
    card();
  }

  /* ---------- Simulacro ---------- */
  function mock() {
    const parts = [1, 2].map(p => shuffle(EXAM.filter(q => q.p === p)).slice(0, 30));
    const list = [...parts[0], ...parts[1]].map(q => ({ q, opts: shuffle(q.a.map((a, i) => ({ a, i }))), pick: null }));
    let i = 0;
    $('examDash').hidden = true; $('examStage').hidden = false;
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
    const grade = () => {
      const res = [1, 2].map(p => { const qs = list.filter(x => x.q.p === p); return { n: qs.length, ok: qs.filter(x => x.pick === x.q.ok).length }; });
      list.forEach(x => { const s = info(x.q.id); if (x.pick === x.q.ok) s.box = Math.min(4, s.box + 1); else { s.wrong++; s.box = 0; } s.seen++; st.q[x.q.id] = s; });
      const pass = res.every(r => r.ok >= r.n / 2);
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
        ${wrong.length ? `<h4 class="ex-rev">Repasa tus fallos</h4><ol class="ex-wrong">${wrong.map(x => `<li><b>${esc(x.q.q)}</b><br>Correcta: ${esc(x.q.a[x.q.ok])}. <span>${esc(x.q.why)}</span></li>`).join('')}</ol>` : ''}`;
      $('exDone').onclick = back;
      document.dispatchEvent(new CustomEvent('radio:progress'));
      document.dispatchEvent(new CustomEvent('radio:mock', { detail: { pass } }));
    };
    show();
  }

  let errPool = [];
  function back() { $('examStage').hidden = true; $('examDash').hidden = false; renderDash(); $('test').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  $('examDash').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const go = b.dataset.go;
    if (go === 'study1') study(EXAM.filter(q => q.p === 1), 'Parte 1');
    if (go === 'study2') study(EXAM.filter(q => q.p === 2), 'Parte 2');
    if (go === 'errors') { errPool = EXAM.filter(q => info(q.id).wrong > 0 && info(q.id).box < 2); study(errPool, 'Tus fallos'); }
    if (go === 'mock') mock();
  });
  renderDash();
})();
