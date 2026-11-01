/**
 * lessons.js · "Cómo funciona la radio": cuatro lecciones interactivas.
 *
 * Página: Entender (#como-funciona). Necesita: #lessonTabs, #lessonStage, #lessonLevels, #lessonText, #lessonQuiz.
 *
 * Lecciones (STAGES): onda (canvas animado + frecuencia → longitud de onda), antena (SVG del dipolo a escala),
 * ionosfera (SVG con capas D/F, día/noche y Sol activo), modos (canvas animado AM/FM/CW/BLU).
 * Cada lección tiene tres niveles de explicación (curioso, interesado, técnico) y 3 preguntas.
 *
 * Guarda en localStorage → "radio.lessons" ({ idLección: true } al acertar las 3 preguntas)
 * y avisa con el evento `radio:progress` para que journey.js lo tenga en cuenta.
 * Rendimiento: los lienzos animados solo se animan mientras se ven (animate → Radio.whileVisible)
 * y no se animan con "reducir movimiento" (se dibujan una vez).
 * Accesibilidad: cada dibujo va acompañado de un texto (.lesson-readout, aria-live) con lo que muestra.
 */
(() => {
  'use strict';
  if (!document.getElementById('como-funciona')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const LESSONS = [
    {
      id: 'onda', title: 'La onda', icon: '〰️',
      levels: [
        'La radio viaja como las olas en un estanque, pero invisibles y a la velocidad de la luz. Cuantas más olas por segundo, más “aguda” es la onda y más cortas son.',
        'El número de olas por segundo es la <b>frecuencia</b> (en megahercios, MHz). La distancia entre dos crestas es la <b>longitud de onda</b>. Por eso las bandas se llaman “40 metros” o “2 metros”: es el tamaño de su onda.',
        'Longitud de onda (m) ≈ 300 / frecuencia (MHz). A 7 MHz: 300 / 7 ≈ 43 m. Las frecuencias bajas rodean obstáculos y rebotan en la ionosfera; las altas viajan en línea recta, como la luz.',
      ],
      quiz: [
        { q: '¿Qué mide la frecuencia?', a: ['Cuántas ondas pasan por segundo', 'Lo fuerte que es la señal', 'La distancia a la emisora'], ok: 0 },
        { q: 'Si la frecuencia sube, la longitud de onda…', a: ['También sube', 'Baja', 'No cambia'], ok: 1 },
        { q: '¿Por qué la banda de 7 MHz se llama “40 metros”?', a: ['Porque llega a 40 km', 'Porque su onda mide unos 40 m', 'Porque usa antenas de 40 m de alto'], ok: 1 },
      ],
    },
    {
      id: 'antena', title: 'La antena', icon: '📡',
      levels: [
        'Una antena es un cable que “lanza” y “atrapa” ondas. Funciona mejor cuando su tamaño encaja con la onda, como una cuerda de guitarra con su nota.',
        'La antena más sencilla es el <b>dipolo</b>: dos cables iguales en línea, alimentados por el centro. En total mide la mitad de la longitud de onda. Para 40 m, unos 20 metros de punta a punta.',
        'Largo del dipolo (m) ≈ 143 / f (MHz), algo menos que λ/2 por el efecto de los extremos. En el centro presenta unos 50-75 Ω, lo que encaja con el cable coaxial. Por eso las bandas altas permiten antenas pequeñas y direccionales.',
      ],
      quiz: [
        { q: '¿Cuánto mide, en total, un dipolo?', a: ['Media longitud de onda', 'Una longitud de onda entera', 'Siempre 1 metro'], ok: 0 },
        { q: '¿Para qué banda es más pequeña la antena?', a: ['80 m', '40 m', '2 m'], ok: 2 },
        { q: '¿Por dónde se conecta el cable a un dipolo?', a: ['Por un extremo', 'Por el centro', 'Por los dos extremos'], ok: 1 },
      ],
    },
    {
      id: 'ionosfera', title: 'La ionosfera', icon: '🌍',
      levels: [
        'Muy arriba, el Sol carga el aire de electricidad. Esa capa, la <b>ionosfera</b>, hace de espejo para algunas ondas: rebotan y caen a miles de kilómetros.',
        'De día aparece una capa baja (la D) que se “come” las frecuencias bajas; de noche desaparece y las bandas bajas llegan lejos. Las frecuencias altas solo rebotan si el Sol está activo; si no, se escapan al espacio.',
        'La reflexión depende de la frecuencia crítica de la capa F y del ángulo. La máxima frecuencia utilizable (MUF) sube de día y con el flujo solar. Por encima de la MUF la onda atraviesa la ionosfera; la capa D absorbe más cuanto más baja es la frecuencia.',
      ],
      quiz: [
        { q: '¿Qué hace la capa D durante el día?', a: ['Refleja todo', 'Absorbe las frecuencias bajas', 'Desaparece'], ok: 1 },
        { q: 'Si una onda va por encima de la MUF…', a: ['Rebota más lejos', 'Se escapa al espacio', 'Se oye más fuerte'], ok: 1 },
        { q: '¿Cuándo suelen funcionar mejor 80 y 40 m?', a: ['De noche', 'A mediodía', 'Nunca'], ok: 0 },
      ],
    },
    {
      id: 'modos', title: 'Cómo viaja tu voz', icon: '🎙️',
      levels: [
        'La onda de radio es como un camión vacío: para que lleve tu voz hay que “cargarla”. Hay varias formas de hacerlo y cada una suena distinta.',
        'En <b>AM</b> cambia la fuerza de la onda; en <b>FM</b>, su frecuencia (la de los walkies). En <b>CW</b> se enciende y apaga para hacer Morse. La <b>BLU</b> (SSB), la favorita en onda corta, solo envía la parte útil de la voz y llega más lejos con la misma potencia.',
        'AM gasta dos tercios de la potencia en la portadora. SSB suprime la portadora y una banda lateral: ocupa unos 2,7 kHz y concentra la energía. FM es inmune a parte del ruido pero necesita más ancho de banda. CW cabe en menos de 200 Hz: máxima eficiencia.',
      ],
      quiz: [
        { q: '¿Qué cambia en FM?', a: ['La fuerza de la onda', 'La frecuencia de la onda', 'Nada'], ok: 1 },
        { q: '¿Qué modo de voz se usa más en onda corta?', a: ['FM', 'BLU (SSB)', 'Televisión'], ok: 1 },
        { q: '¿Cuál ocupa menos espacio en el dial?', a: ['CW (Morse)', 'AM', 'FM'], ok: 0 },
      ],
    },
  ];

  let current = LESSONS[0], level = 0, stopAnim = null;
  const done = store.get('radio.lessons') || {};

  /* ---------- Dibujos interactivos ---------- */
  function sizeCanvas(c) {
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    c.width = r.width * d; c.height = r.height * d;
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    return { g, w: r.width, h: r.height };
  }

  /** Anima solo mientras el lienzo se ve y la pestaña está activa. Devuelve la función para parar. */
  function animate(el, start, stop) {
    if (Radio.reducedMotion) return () => {};
    const unwatch = Radio.whileVisible(el, start, stop);
    return () => { unwatch(); stop(); };
  }

  const STAGES = {
    onda(box) {
      box.innerHTML = `<canvas class="lesson-canvas" aria-hidden="true"></canvas>
        <label class="inline">Frecuencia <input type="range" id="lwF" min="0" max="1000" value="400"> <b id="lwFv"></b></label>
        <p class="lesson-readout" id="lwOut" aria-live="polite"></p>`;
      const c = box.querySelector('canvas'); let t = 0, run = false;
      const freq = () => 1.8 * Math.pow(450 / 1.8, $('lwF').value / 1000);
      const compare = l => l > 100 ? 'más que un campo de fútbol' : l > 30 ? 'como un edificio de 10 plantas' : l > 8 ? 'como un autobús' : l > 1.5 ? 'como una persona' : l > 0.3 ? 'como un plato' : 'como un móvil';
      function frame() {
        const { g, w, h } = sizeCanvas(c), f = freq(), lam = 300 / f;
        const cycles = 1 + Math.log(f / 1.8) / Math.log(450 / 1.8) * 11;
        g.clearRect(0, 0, w, h);
        g.strokeStyle = css('--line'); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        g.strokeStyle = css('--accent'); g.lineWidth = 2.5; g.beginPath();
        for (let x = 0; x <= w; x += 2) { const y = h / 2 - Math.sin((x / w) * cycles * 2 * Math.PI - t) * (h * 0.36); x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); t += 0.06;
        $('lwFv').textContent = f < 10 ? f.toFixed(2) + ' MHz' : f.toFixed(0) + ' MHz';
        $('lwOut').innerHTML = `Longitud de onda: <b>${lam >= 10 ? lam.toFixed(0) : lam.toFixed(2)} m</b>, ${compare(lam)}.`;
        if (run && !Radio.reducedMotion) requestAnimationFrame(frame);
      }
      $('lwF').addEventListener('input', () => { if (!run) frame(); });
      frame(); // primer dibujo, aunque no se anime
      return animate(c, () => { if (!run) { run = true; frame(); } }, () => { run = false; });
    },
    antena(box) {
      const bands = [['80 m', 3.65], ['40 m', 7.1], ['20 m', 14.2], ['10 m', 28.5], ['2 m', 145]];
      box.innerHTML = `<svg class="lesson-svg" viewBox="0 0 600 220" id="laSvg" aria-hidden="true"></svg>
        <div class="chips" id="laBands">${bands.map((b, i) => `<button class="chip${i === 1 ? ' on' : ''}" data-i="${i}">${b[0]}</button>`).join('')}</div>
        <p class="lesson-readout" id="laOut" aria-live="polite"></p>`;
      function draw(i) {
        const [name, f] = bands[i], len = 143 / f;
        const scale = Math.min(520 / len, 260); // px por metro, con tope para que la persona no sea gigante
        const half = (len * scale) / 2, cx = 300, y = 70;
        const person = 1.75 * scale;
        $('laSvg').innerHTML = `
          <line x1="${cx - half}" y1="${y}" x2="${cx - 6}" y2="${y}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
          <line x1="${cx + 6}" y1="${y}" x2="${cx + half}" y2="${y}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
          <rect x="${cx - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="var(--hot)"/>
          <path d="M${cx} ${y + 6} V200" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>
          <text x="${cx + 8}" y="150" fill="var(--muted)" font-size="12">cable coaxial</text>
          <text x="${cx}" y="${y - 16}" fill="var(--ink)" font-size="14" text-anchor="middle">${len >= 10 ? len.toFixed(1) : len.toFixed(2)} m</text>
          ${person < 200 ? `<g transform="translate(${cx + 120},${200 - person})" fill="var(--muted)"><circle cx="0" cy="${person * 0.08}" r="${person * 0.08}"/><rect x="${-person * 0.07}" y="${person * 0.17}" width="${person * 0.14}" height="${person * 0.83}" rx="${person * 0.05}"/></g>
          <text x="${cx + 120}" y="215" fill="var(--muted)" font-size="11" text-anchor="middle">persona (1,75 m)</text>` : ''}
          <line x1="0" y1="200" x2="600" y2="200" stroke="var(--line)"/>`;
        $('laOut').innerHTML = `Un dipolo para <b>${name}</b> mide unos <b>${len >= 10 ? len.toFixed(1) : len.toFixed(2)} m</b> de punta a punta: dos brazos de ${(len / 2).toFixed(len >= 10 ? 1 : 2)} m.`;
        box.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      }
      box.querySelector('#laBands').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) draw(+b.dataset.i); });
      draw(1);
      return null;
    },
    ionosfera(box) {
      const freqs = [['80 m', 3.6], ['40 m', 7.1], ['20 m', 14.2], ['10 m', 28.5]];
      let fi = 1, day = new Date().getHours() >= 8 && new Date().getHours() < 19, sun = false;
      box.innerHTML = `<svg class="lesson-svg" viewBox="0 0 600 260" id="liSvg" aria-hidden="true"></svg>
        <div class="row"><div class="chips" id="liF">${freqs.map((b, i) => `<button class="chip" data-i="${i}">${b[0]}</button>`).join('')}</div>
        <div class="chips"><button class="chip" id="liDay"></button><button class="chip" id="liSun">☀️ Sol muy activo</button></div></div>
        <p class="lesson-readout" id="liOut" aria-live="polite"></p>`;
      function draw() {
        const f = freqs[fi][1];
        const muf = (day ? 16 : 9) * (sun ? 2 : 1);
        const absorbed = day && f < 5;
        const escapes = f > muf;
        const hF = day ? 70 : 90; // altura de la capa F en el dibujo (menor y = más alto)
        let path, out;
        if (absorbed) {
          path = 'M40 230 Q90 170 140 150'; out = 'De día la capa D se traga esta frecuencia: la señal se apaga antes de rebotar. Prueba de noche.';
        } else if (escapes) {
          path = 'M40 230 Q200 120 300 20'; out = `Va por encima de la frecuencia máxima (≈${muf} MHz ahora): atraviesa la ionosfera y se pierde en el espacio.`;
        } else {
          const dist = Math.min(520, 160 + f * 22);
          path = `M40 230 L${40 + dist / 2} ${hF} L${40 + dist} 230`;
          out = `Rebota en la capa F y cae a unos <b>${Math.round(dist * 6)} km</b>. Con varios saltos puede dar la vuelta al mundo.`;
        }
        $('liSvg').innerHTML = `
          <rect x="0" y="${hF - 22}" width="600" height="30" fill="var(--accent)" opacity=".12"/>
          <text x="590" y="${hF - 4}" fill="var(--muted)" font-size="12" text-anchor="end">capa F</text>
          ${day ? `<rect x="0" y="150" width="600" height="20" fill="var(--hot)" opacity=".14"/><text x="590" y="164" fill="var(--muted)" font-size="12" text-anchor="end">capa D (solo de día)</text>` : ''}
          <path d="M0 238 Q300 222 600 238 L600 260 L0 260Z" fill="var(--panel)" stroke="var(--line)"/>
          <path d="${path}" fill="none" stroke="${absorbed ? 'var(--red)' : 'var(--accent)'}" stroke-width="3" stroke-dasharray="${absorbed ? '6 5' : 'none'}"/>
          <circle cx="40" cy="230" r="6" fill="var(--hot)"/><text x="40" y="252" fill="var(--muted)" font-size="11" text-anchor="middle">tú</text>
          <text x="20" y="24" fill="var(--ink)" font-size="13">${day ? '☀️ Día' : '🌙 Noche'} · ${freqs[fi][0]} (${f} MHz)</text>`;
        $('liOut').innerHTML = out;
        $('liDay').textContent = day ? '🌙 Pasar a noche' : '☀️ Pasar a día';
        $('liSun').classList.toggle('on', sun);
        box.querySelectorAll('#liF .chip').forEach(b => b.classList.toggle('on', +b.dataset.i === fi));
      }
      box.querySelector('#liF').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { fi = +b.dataset.i; draw(); } });
      box.querySelector('#liDay').addEventListener('click', () => { day = !day; draw(); });
      box.querySelector('#liSun').addEventListener('click', () => { sun = !sun; draw(); });
      draw();
      return null;
    },
    modos(box) {
      const modes = ['AM', 'FM', 'CW', 'SSB'];
      let m = 0, t = 0, run = false;
      box.innerHTML = `<canvas class="lesson-canvas" aria-hidden="true"></canvas>
        <div class="chips" id="lmM">${modes.map((x, i) => `<button class="chip${i ? '' : ' on'}" data-i="${i}">${x === 'SSB' ? 'BLU (SSB)' : x}</button>`).join('')}</div>
        <p class="lesson-readout" id="lmOut" aria-live="polite"></p>`;
      const text = [
        'AM: la portadora sube y baja de fuerza siguiendo tu voz (la línea amarilla).',
        'FM: la fuerza es constante; lo que cambia es lo apretadas que van las ondas.',
        'CW: la portadora se enciende y se apaga. Eso es Morse.',
        'BLU: no hay portadora fija; solo sale energía cuando hablas. Por eso llega más lejos.',
      ];
      function frame() {
        const { g, w, h } = sizeCanvas(c);
        g.clearRect(0, 0, w, h);
        const voice = x => Math.sin(x * 0.018 - t * 0.6) * 0.6 + Math.sin(x * 0.041 - t) * 0.3;
        const key = x => ((Math.floor((x + t * 30) / 60) % 4) !== 3 && (Math.floor((x + t * 30) / 20) % 3) !== 2) ? 1 : 0;
        g.lineWidth = 1.6; g.strokeStyle = css('--accent'); g.beginPath();
        let phase = 0;
        for (let x = 0; x <= w; x += 1) {
          let a = 1, f = 0.55;
          if (m === 0) a = 0.55 + 0.4 * voice(x);
          if (m === 1) { f = 0.55 + 0.35 * voice(x); }
          if (m === 2) a = key(x);
          if (m === 3) a = Math.max(0, voice(x)) * 1.1;
          phase += f;
          const y = h / 2 - Math.sin(phase - t * 4) * a * h * 0.38;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        if (m === 0 || m === 3) {
          g.strokeStyle = css('--hot'); g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath();
          for (let x = 0; x <= w; x += 3) { const a = m === 0 ? 0.55 + 0.4 * voice(x) : Math.max(0, voice(x)) * 1.1; const y = h / 2 - a * h * 0.38; x ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke(); g.setLineDash([]);
        }
        t += 0.05;
        if (run && !Radio.reducedMotion) requestAnimationFrame(frame);
      }
      const c = box.querySelector('canvas');
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
  function renderTabs() {
    $('lessonTabs').innerHTML = LESSONS.map(l =>
      `<button class="lesson-tab${l === current ? ' on' : ''}" data-id="${l.id}">${l.icon} ${l.title}${done[l.id] ? ' <span class="tick">✓</span>' : ''}</button>`).join('');
  }
  function renderLevel() {
    $('lessonLevels').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === level));
    $('lessonText').innerHTML = `<p>${current.levels[level]}</p>`;
  }
  function renderQuiz() {
    let hits = 0, answered = 0;
    $('lessonQuiz').innerHTML = '<h4>Comprueba que lo has pillado</h4>' + current.quiz.map((q, qi) =>
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
        $('lqResult').textContent = hits === 3 ? '¡Perfecto! Lección completada ✓' : `${hits} de 3. Sube un nivel de explicación y vuelve a probar.`;
        if (hits === 3) { done[current.id] = true; store.set('radio.lessons', done); renderTabs(); document.dispatchEvent(new CustomEvent('radio:progress')); }
      }
    };
  }
  function show(l) {
    current = l;
    if (stopAnim) stopAnim();
    stopAnim = STAGES[l.id]($('lessonStage'));
    renderTabs(); renderLevel(); renderQuiz();
  }

  $('lessonTabs').addEventListener('click', e => { const b = e.target.closest('.lesson-tab'); if (b) show(LESSONS.find(l => l.id === b.dataset.id)); });
  $('lessonLevels').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { level = +b.dataset.l; renderLevel(); } });
  show(LESSONS[0]);
})();
