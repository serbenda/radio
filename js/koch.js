// Entrenador de Morse con método Koch y reconocimiento instantáneo:
// letras a 20 ppm, se desbloquea una nueva al dominar las anteriores, repite más las que fallas o tardas,
// mide el tiempo de reacción y lleva racha diaria. Todo se guarda en el navegador.
(() => {
  const $ = id => document.getElementById(id);
  const ORDER = 'KMURESNAPTLWIJZFOYVG5Q92H38B47C1D60X'.split('');
  const WPM = 20;
  const KEY = 'radio.koch';
  const today = () => new Date().toISOString().slice(0, 10);
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  st = st || { level: 2, hist: {}, recent: [], streak: 0, lastDay: null, todaySec: 0, day: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  let current = null, heardAt = 0, busy = false, sessionStart = null;

  function unlocked() { return ORDER.slice(0, st.level); }
  function stats(c) { return st.hist[c] || []; } // últimos 5: [{ok, ms}]
  function acc(c) { const h = stats(c); return h.length ? h.filter(x => x.ok).length / h.length : 0; }

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

  function renderKeys() {
    $('kochKeys').innerHTML = unlocked().map(c => {
      const a = acc(c), h = stats(c).length;
      const cls = !h ? '' : a >= 0.8 ? 'good' : a >= 0.5 ? 'fair' : 'bad';
      return `<button class="kkey ${cls}" data-c="${c}">${c}</button>`;
    }).join('');
    const mins = Math.round(st.todaySec / 60);
    $('kochStats').innerHTML = `Letras: <b>${st.level}/${ORDER.length}</b> · Racha: <b>${st.streak} día${st.streak === 1 ? '' : 's'}</b> · Hoy: <b>${mins} min</b>${mins >= 15 ? ' ✓' : ' de 15'}`;
  }

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

  function answer(c) {
    if (!current || busy || $('kochPrompt').textContent !== '?') return;
    const ms = Math.round(performance.now() - heardAt);
    const ok = c === current;
    const h = stats(current).concat({ ok, ms }).slice(-5);
    st.hist[current] = h;
    st.recent = st.recent.concat(ok).slice(-10);
    $('kochPrompt').textContent = current;
    $('kochFeedback').innerHTML = ok
      ? `✅ <b>${current}</b> en ${(ms / 1000).toFixed(1)} s${ms < 1000 ? ' ⚡' : ''}`
      : `❌ Era <b>${current}</b> (${Morse.CODE[current].replace(/\./g, '•').replace(/-/g, '—')}), no ${c}`;
    // ¿desbloquear la siguiente?
    const newest = unlocked().at(-1), nh = stats(newest);
    const recentOk = st.recent.length >= 10 && st.recent.filter(Boolean).length >= 9;
    if (st.level < ORDER.length && recentOk && nh.length >= 5 && nh.filter(x => x.ok).length >= 4) {
      st.level++; st.recent = [];
      $('kochFeedback').innerHTML += ` · 🎉 Nueva letra: <b>${ORDER[st.level - 1]}</b>`;
      document.dispatchEvent(new CustomEvent('radio:progress'));
    }
    tickDay();
    save(); renderKeys();
    setTimeout(next, ok ? 500 : 1300);
  }

  function tickDay() {
    const d = today();
    if (st.day !== d) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      st.streak = st.lastDay === y ? st.streak + 1 : st.lastDay === d ? st.streak : 1;
      st.lastDay = d; st.day = d; st.todaySec = 0;
    }
    if (sessionStart) { st.todaySec += (performance.now() - sessionStart) / 1000; sessionStart = performance.now(); }
  }

  $('kochStart').addEventListener('click', () => {
    sessionStart = performance.now();
    tickDay(); save();
    $('kochStart').hidden = true;
    $('kochBoard').hidden = false;
    renderKeys();
    next();
  });
  $('kochKeys').addEventListener('click', e => { const b = e.target.closest('.kkey'); if (b) answer(b.dataset.c); });
  $('kochRepeat').addEventListener('click', async () => { if (current && !busy) { busy = true; await Morse.play(current, WPM, 650); heardAt = performance.now(); busy = false; } });
  document.addEventListener('keydown', e => {
    if ($('kochBoard').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const c = e.key.toUpperCase();
    if (unlocked().includes(c)) { e.preventDefault(); answer(c); }
  });
  renderKeys();
})();
