/**
 * journey.js · "Tu primer mes": ruta de 4 semanas que se completa sola según lo que haces en la web.
 *
 * Páginas: TODAS (registra logros en cualquier página). Solo pinta la ruta donde existe #weeks (Inicio).
 *
 * Cómo se entera de lo que haces:
 *  - Escucha el evento `radio:event` ({ name, id }) que emiten los demás módulos con Radio.emit():
 *      station  → stations.js, al reproducir una emisora (id = emisora)
 *      websdr   → este módulo, al hacer clic en cualquier enlace a un receptor web real
 *      sound    → sounds.js, al reproducir un sonido (id = sonido)
 *      prop     → propagation.js, al tocar una banda del semáforo para ver qué significa
 *      live     → live.js, al filtrar por banda o abrir un aviso para escucharlo
 *      iss      → iss.js, al cambiar de ciudad o usar tu ubicación para calcular pases
 *  - Escucha `radio:qso` (qso.js, { scenario }) y `radio:mock` (exam.js, { pass }).
 *  - Lee lo que otros módulos ya guardan: radio.lessons, radio.koch, radio.exam, radio.checklist.
 *
 * Guarda en localStorage → "radio.journey":
 *   { since: fecha de inicio, ev: { nombre: [ids únicos] }, badges: { índiceSemana: fecha } }
 *
 * Diseño: un paso solo cuenta si la persona HACE algo (pulsar, escuchar, responder), nunca por
 * desplazarse por la página. Ver docs/MODULOS.md y docs/DECISIONES.md.
 */
(() => {
  'use strict';
  const { $, store, url } = Radio;
  const KEY = 'radio.journey';
  let st = store.get(KEY) || { since: Date.now(), ev: {}, badges: {} };
  const save = () => store.set(KEY, st);
  const list = name => (st.ev[name] = st.ev[name] || []);
  const count = name => (st.ev[name] || []).length;

  // Lecturas de lo que guardan los demás módulos
  const lessons = () => Object.values(store.get('radio.lessons', {})).filter(Boolean).length;
  const koch = () => store.get('radio.koch', {}).level || 0;
  const examSeen = () => Object.values(store.get('radio.exam', {}).q || {}).reduce((a, x) => a + (x.seen || 0), 0);
  const examReady = () => { const r = store.get('radio.exam', {}).ready || {}; return (r[1] || 0) >= 80 && (r[2] || 0) >= 80; };
  const checklist = k => !!store.get('radio.checklist', {})[k];

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
  document.addEventListener('radio:event', e => {
    const { name, id } = e.detail || {};
    if (!name) return;
    const l = list(name), key = id || 'x' + l.length;
    if (!l.includes(key)) l.push(key);
    save(); render();
  });
  document.addEventListener('radio:qso', e => { const l = list('qso'), s = e.detail && e.detail.scenario; if (s && !l.includes(s)) l.push(s); save(); render(); });
  document.addEventListener('radio:mock', e => { if (e.detail && e.detail.pass) { list('apto').push(Date.now()); save(); } render(); });
  document.addEventListener('radio:progress', () => render());
  // Cualquier enlace a un receptor web real, esté en la página que esté
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="websdr"], a[href*="kiwisdr"], a[href*="linkfanel"]');
    if (a) Radio.emit('websdr', a.href);
  });

  /* ---------- Pintado (solo en la portada) ---------- */
  const weeksEl = $('weeks');
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
    const day = Math.floor((Date.now() - st.since) / 864e5) + 1;
    $('journeyMeta').innerHTML = `<b>${done}</b> de ${total} pasos · <b>${pct}%</b> · día ${day} de tu ruta`;
    $('journeyShare').hidden = done === 0;
  }

  function celebrate(badge) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `🎉 ¡Nueva insignia! <b>${badge}</b>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }

  if (weeksEl) {
    $('journeyShare').addEventListener('click', async () => {
      const badges = WEEKS.filter((w, i) => st.badges[i]).map(w => w.badge).join(' ');
      const text = `📻 Estoy aprendiendo radioafición: ${$('journeyMeta').textContent}${badges ? ' · ' + badges : ''}. ¿Te apuntas?`;
      const link = 'https://bendi.dev/radio/#mes';
      if (navigator.share) { try { await navigator.share({ text, url: link }); } catch (e) { /* cancelado */ } return; }
      try { await navigator.clipboard.writeText(text + ' ' + link); $('journeyShare').textContent = '✅ Copiado'; setTimeout(() => { $('journeyShare').textContent = '📤 Compartir mi progreso'; }, 2500); } catch (e) { /* sin portapapeles */ }
    });
    $('journeyReset').addEventListener('click', () => {
      if (!confirm('¿Empezar la ruta desde cero? Se borra el progreso de la ruta (no el del examen ni el de Morse).')) return;
      st = { since: Date.now(), ev: {}, badges: {} }; save(); render();
    });
    render();
  }
})();
