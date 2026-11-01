// Interacciones de la página: dial, bandas, Morse, deletreo, test y FAQ.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Reloj UTC ---------- */
  const tick = () => { $('utc').textContent = new Date().toISOString().slice(11, 16); };
  tick(); setInterval(tick, 10000);

  /* ---------- Dial del hero (escala logarítmica 1,8-30 MHz) ---------- */
  const F_MIN = 1.8, F_MAX = 30;
  const pos = f => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
  const freqAt = p => F_MIN * Math.pow(F_MAX / F_MIN, p);
  const isDay = () => { const h = new Date().getHours(); return h >= 8 && h < 19; };

  $('dialScale').innerHTML = DIAL_BANDS.map(b =>
    `<span class="mark" style="left:${(pos(b.from) * 100).toFixed(2)}%;width:${Math.max(0.8, (pos(b.to) - pos(b.from)) * 100).toFixed(2)}%">${b.name === '12 m' ? '' : `<b>${b.name.replace(' m', '')}</b>`}</span>`
  ).join('');

  function dialMood(b) {
    const day = isDay();
    const low = ['160 m', '80 m'].includes(b.name);
    const high = ['15 m', '12 m', '10 m', '17 m', '20 m'].includes(b.name);
    if (low) return day ? 'de día, poco que oír' : 'ahora: abierta, charlas cercanas';
    if (high) return day ? 'ahora: abierta, DX lejano' : 'de noche suele cerrarse';
    return day ? 'ahora: España y vecinos' : 'ahora: Europa entera';
  }

  function updateDial() {
    const p = $('dialKnob').value / 1000;
    const f = freqAt(p);
    $('dialNeedle').style.left = (p * 100) + '%';
    $('dialFreq').textContent = f.toFixed(3);
    const inside = DIAL_BANDS.find(b => f >= b.from && f <= b.to);
    if (inside) {
      $('dialBand').textContent = `${inside.name} · ${dialMood(inside)}`;
      $('dialBand').classList.add('hot');
    } else {
      const near = DIAL_BANDS.reduce((a, b) => (Math.abs(pos(b.from) - p) < Math.abs(pos(a.from) - p) ? b : a));
      $('dialBand').textContent = `fuera de banda · la más cercana: ${near.name}`;
      $('dialBand').classList.remove('hot');
    }
  }
  $('dialKnob').addEventListener('input', updateDial);

  // Señal del dial: limpia dentro de banda, ruido fuera
  const wave = $('wavePath');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = 0;
  function drawWave() {
    const clear = $('dialBand').classList.contains('hot');
    const pts = [];
    for (let x = 0; x <= 400; x += 4) {
      const env = Math.sin((x / 400) * Math.PI);
      const sig = clear ? Math.sin(x / 9 + phase) * 16 * env : 0;
      const noise = (Math.random() - 0.5) * (clear ? 4 : 18) * env;
      pts.push(`${x},${(30 + sig + noise).toFixed(1)}`);
    }
    wave.setAttribute('d', 'M' + pts.join(' L'));
    wave.parentNode.classList.toggle('clear', clear);
    phase += 0.25;
    if (!still) setTimeout(() => requestAnimationFrame(drawWave), 60);
  }
  drawWave();
  // arranca en 40 m
  $('dialKnob').value = Math.round(pos(7.1) * 1000);
  updateDial();


  /* ---------- Escucha guiada ---------- */
  const hour = new Date().getHours();
  const isDaytime = hour >= 8 && hour < 18;
  const recommended = LISTEN.find(l => l.best === (isDaytime ? 'day' : 'night'));
  function showListen(l) {
    $('guidedTitle').textContent = l.title;
    $('guidedText').textContent = l.text;
    $('guidedGo').href = WEBSDR + l.tune;
    $('guidedWhen').textContent = l === recommended ? (isDaytime ? 'lo mejor a esta hora (de día)' : 'lo mejor a esta hora (de noche)') : 'tu elección';
    $('guidedPresets').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === l.id));
  }
  $('guidedPresets').innerHTML = LISTEN.map(l => `<button class="chip" data-id="${l.id}">${l.chip}</button>`).join('');
  $('guidedPresets').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (b) showListen(LISTEN.find(l => l.id === b.dataset.id));
  });
  showListen(recommended);

  /* ---------- Bandas ---------- */
  const bandsEl = $('bands');
  bandsEl.innerHTML = BANDS.map((b, i) =>
    `<button class="band ${b.kind}" data-i="${i}"><b>${b.name}</b><small>${b.from}–${b.to} MHz</small></button>`
  ).join('');
  function showBand(i) {
    const b = BANDS[i];
    bandsEl.querySelectorAll('.band').forEach(el => el.classList.toggle('on', +el.dataset.i === i));
    const kindName = { hf: 'Onda corta (HF)', vhf: 'VHF', uhf: 'UHF' }[b.kind];
    $('bandDetail').innerHTML = `<h3>${b.name} <span>${kindName} · ${b.from}–${b.to} MHz</span></h3>
      <p><strong>Mejor momento:</strong> ${b.when}</p><p>${b.text}</p>`;
  }
  bandsEl.addEventListener('click', e => { const b = e.target.closest('.band'); if (b) showBand(+b.dataset.i); });
  showBand(2);

  /* ---------- Morse: traductor ---------- */
  const renderMorse = () => {
    const code = Morse.encode($('morseIn').value);
    $('morseOut').innerHTML = code
      ? code.split(' ').map(w => w === '/' ? '<i class="gap"></i>' : `<span>${w.replace(/\./g, '•').replace(/-/g, '—')}</span>`).join('')
      : '<em>Escribe algo arriba</em>';
  };
  $('morseIn').addEventListener('input', renderMorse);
  renderMorse();
  $('wpm').addEventListener('input', e => { $('wpmVal').textContent = e.target.value; });
  $('morsePlay').addEventListener('click', async () => {
    const btn = $('morsePlay');
    btn.disabled = true; btn.textContent = '♪ Sonando…';
    await Morse.play($('morseIn').value, +$('wpm').value);
    btn.disabled = false; btn.textContent = '▶ Escuchar';
  });

  /* ---------- Alfabeto fonético ---------- */
  const renderPhonetic = () => {
    const txt = $('phoneticIn').value.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    $('phoneticOut').innerHTML = txt.split('').map(c =>
      c === ' ' ? '<i class="gap"></i>' : PHONETIC[c] ? `<span><b>${c}</b>${PHONETIC[c]}</span>` : ''
    ).join('') || '<em>Ejemplo: EA4 → Echo Alfa Cuatro</em>';
  };
  $('phoneticIn').addEventListener('input', renderPhonetic);
  renderPhonetic();

  /* ---------- Jerga ---------- */
  $('glossary').innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('');


  /* ---------- Compartir la web ---------- */
  $('shareSite').addEventListener('click', async () => {
    const data = { title: 'Radio · Descubre la radioafición', text: 'Escucha emisoras de todo el mundo y haz tu primer contacto por radio 📻', url: 'https://bendi.dev/radio/' };
    if (navigator.share) { try { await navigator.share(data); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(data.url); $('shareSite').textContent = '✅ Enlace copiado'; }
    catch (e) { $('shareSite').textContent = data.url; }
    setTimeout(() => { $('shareSite').textContent = '📤 Compartir esta web'; }, 2500);
  });

  /* ---------- Lista de comprobación del trámite ---------- */
  const CK = 'radio.checklist';
  let ck = {}; try { ck = JSON.parse(localStorage.getItem(CK)) || {}; } catch (e) {}
  const boxes = [...document.querySelectorAll('#checklist input')];
  const ckNote = () => { const n = boxes.filter(b => b.checked).length; $('checkNote').textContent = n === boxes.length ? '🎉 ¡Ya eres radioaficionado! 73.' : `${n} de ${boxes.length} pasos hechos. Se guarda en este navegador.`; };
  boxes.forEach(b => { b.checked = !!ck[b.dataset.k]; b.addEventListener('change', () => { ck[b.dataset.k] = b.checked; try { localStorage.setItem(CK, JSON.stringify(ck)); } catch (e) {} ckNote(); document.dispatchEvent(new CustomEvent('radio:progress')); }); });
  ckNote();

  /* ---------- FAQ ---------- */
  $('faqList').innerHTML = FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('');
})();
