// "Tu primer mes": ruta de 4 semanas que se completa sola según lo que haces en la web.
// Escucha los eventos de las demás secciones y lee lo que ya guardan en el navegador.
(() => {
  const $ = id => document.getElementById(id);
  const KEY = 'radio.journey';
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  let st = get(KEY) || { since: Date.now(), ev: {}, badges: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const set = name => (st.ev[name] = st.ev[name] || []);
  const count = name => (st.ev[name] || []).length;

  const lessons = () => Object.values(get('radio.lessons') || {}).filter(Boolean).length;
  const koch = () => (get('radio.koch') || {}).level || 0;
  const exam = () => { const q = (get('radio.exam') || {}).q || {}; return Object.values(q).reduce((a, x) => a + (x.seen || 0), 0); };
  const ready = () => {
    const q = (get('radio.exam') || {}).q || {};
    if (typeof EXAM === 'undefined') return false;
    return [1, 2].every(p => { const qs = EXAM.filter(x => x.p === p); return qs.filter(x => (q[x.id] || {}).box >= 3).length / qs.length >= 0.8; });
  };
  const checklist = k => !!(get('radio.checklist') || {})[k];

  const WEEKS = [
    { name: 'Semana 1 · Escuchar', badge: '👂 Oyente', tasks: [
      { id: 'emisoras', text: 'Escucha 3 emisoras distintas del mapa', href: '#emisoras', done: () => count('station') >= 3, prog: () => `${Math.min(3, count('station'))}/3` },
      { id: 'websdr', text: 'Abre un receptor real de onda corta', href: '#directo', done: () => count('websdr') >= 1 },
      { id: 'sonidos', text: 'Escucha y mira 4 sonidos en la cascada', href: '#sonidos', done: () => count('sound') >= 4, prog: () => `${Math.min(4, count('sound'))}/4` },
    ] },
    { name: 'Semana 2 · Entender', badge: '🤓 Curioso', tasks: [
      { id: 'lecciones', text: 'Completa 2 lecciones de “Cómo funciona”', href: '#como-funciona', done: () => lessons() >= 2, prog: () => `${Math.min(2, lessons())}/2` },
      { id: 'prop', text: 'Mira cómo está hoy la propagación', href: '#propagacion', done: () => count('prop') >= 1 },
      { id: 'ahora', text: 'Descubre quién está hablando ahora en el mundo', href: '#ahora', done: () => count('live') >= 1 },
      { id: 'koch', text: 'Aprende 6 letras con el entrenador Koch', href: '#morse', done: () => koch() >= 6, prog: () => `${Math.min(6, koch())}/6` },
    ] },
    { name: 'Semana 3 · Practicar', badge: '🎙️ Operador', tasks: [
      { id: 'qso1', text: 'Haz tu primer contacto simulado', href: '#qso', done: () => (st.ev.qso || []).includes('primero') },
      { id: 'qso3', text: 'Prueba 3 tipos de contacto distintos', href: '#qso', done: () => count('qso') >= 3, prog: () => `${Math.min(3, count('qso'))}/3` },
      { id: 'tarjetas', text: 'Responde 50 tarjetas del examen', href: '#test', done: () => exam() >= 50, prog: () => `${Math.min(50, exam())}/50` },
    ] },
    { name: 'Semana 4 · Dar el salto', badge: '📻 Casi radioaficionado', tasks: [
      { id: 'listo', text: 'Lleva el termómetro del examen al 80 %', href: '#test', done: ready },
      { id: 'apto', text: 'Saca APTO en un simulacro', href: '#test', done: () => count('apto') >= 1 },
      { id: 'iss', text: 'Calcula cuándo pasa la ISS sobre ti', href: '#iss', done: () => count('iss') >= 1 },
      { id: 'club', text: 'Contacta con un radioclub', href: '#empezar', done: () => checklist('club') },
    ] },
  ];

  function render() {
    let total = 0, done = 0;
    const html = WEEKS.map((w, wi) => {
      const ok = w.tasks.map(t => t.done());
      total += ok.length; done += ok.filter(Boolean).length;
      const full = ok.every(Boolean);
      if (full && !st.badges[wi]) { st.badges[wi] = Date.now(); save(); celebrate(w.badge); }
      return `<div class="week${full ? ' full' : ''}">
        <h3>${w.name}</h3>
        <ul>${w.tasks.map((t, i) => `<li class="${ok[i] ? 'ok' : ''}"><span class="tick">${ok[i] ? '✓' : ''}</span><a href="${t.href}">${t.text}</a>${!ok[i] && t.prog ? `<small>${t.prog()}</small>` : ''}</li>`).join('')}</ul>
        <p class="badge${full ? ' won' : ''}">${full ? 'Insignia: ' : 'Al terminar: '}<b>${w.badge}</b></p>
      </div>`;
    }).join('');
    $('weeks').innerHTML = html;
    const pct = Math.round(done / total * 100);
    $('journeyBar').style.width = pct + '%';
    const day = Math.floor((Date.now() - st.since) / 864e5) + 1;
    $('journeyMeta').innerHTML = `<b>${done}</b> de ${total} pasos · <b>${pct}%</b> · día ${day} de tu ruta`;
    $('journeyShare').hidden = done === 0;
  }

  function celebrate(badge) {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `🎉 ¡Nueva insignia! <b>${badge}</b>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }

  // Eventos de las demás secciones
  document.addEventListener('radio:event', e => {
    const { name, id } = e.detail || {};
    if (!name) return;
    const list = set(name);
    const key = id || 'x' + list.length;
    if (!list.includes(key)) list.push(key);
    save(); render();
  });
  document.addEventListener('radio:qso', e => { const l = set('qso'); const s = e.detail && e.detail.scenario; if (s && !l.includes(s)) l.push(s); save(); render(); });
  document.addEventListener('radio:mock', e => { if (e.detail && e.detail.pass) { set('apto').push(Date.now()); save(); } render(); });
  document.addEventListener('radio:progress', render);
  // Clics en enlaces a receptores reales, estén donde estén
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="websdr"], a[href*="kiwisdr"], a[href*="linkfanel"]');
    if (a) document.dispatchEvent(new CustomEvent('radio:event', { detail: { name: 'websdr', id: a.href } }));
  });

  $('journeyShare').addEventListener('click', async () => {
    const badges = WEEKS.filter((w, i) => st.badges[i]).map(w => w.badge).join(' ');
    const text = `📻 Estoy aprendiendo radioafición: ${$('journeyMeta').textContent}${badges ? ' · ' + badges : ''}. ¿Te apuntas?`;
    const url = 'https://bendi.dev/radio/#mes';
    if (navigator.share) { try { await navigator.share({ text, url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); $('journeyShare').textContent = '✅ Copiado'; setTimeout(() => { $('journeyShare').textContent = '📤 Compartir mi progreso'; }, 2500); } catch (e) {}
  });
  $('journeyReset').addEventListener('click', () => {
    if (!confirm('¿Empezar la ruta desde cero? Se borra el progreso de la ruta (no el del examen ni el de Morse).')) return;
    st = { since: Date.now(), ev: {}, badges: {} }; save(); render();
  });

  render();
})();
