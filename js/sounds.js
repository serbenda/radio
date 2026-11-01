// "¿Qué es este sonido?": sonidos típicos de la radio sintetizados en el navegador,
// con una cascada (espectrograma) en directo para aprender a reconocerlos también a la vista.
(() => {
  const $ = id => document.getElementById(id);
  const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';

  const SOUNDS = [
    { id: 'cw', icon: '📟', name: 'Morse (CW)', tune: '7020cw',
      what: 'Pitidos cortos y largos de un solo tono. Es un radioaficionado llamando “CQ” en telegrafía.',
      look: 'En la cascada: una raya fina y vertical que se corta y vuelve, como un código de barras.' },
    { id: 'ft8', icon: '🤖', name: 'FT8 (digital)', tune: '14074usb',
      what: 'Varios pitidos suaves que cambian de nota durante unos 13 segundos y luego paran. Son ordenadores haciendo contactos.',
      look: 'En la cascada: escaleras estrechas, una al lado de otra, todas empezando y acabando a la vez.' },
    { id: 'rtty', icon: '📠', name: 'Radioteletipo (RTTY)', tune: '14085usb',
      what: 'Un “burbujeo” rápido entre dos notas. Es texto enviado letra a letra, como un télex.',
      look: 'En la cascada: dos rayas paralelas muy juntas que parpadean.' },
    { id: 'beacon', icon: '🗼', name: 'Baliza', tune: '14100cw',
      what: 'Un indicativo en Morse y cuatro rayas largas cada vez más flojas. Sirven para comprobar hasta dónde llega la señal.',
      look: 'En la cascada: el indicativo y luego cuatro trazos que se van apagando.' },
    { id: 'pips', icon: '⏱️', name: 'Señal horaria', tune: '9996am',
      what: 'Pitidos exactos cada segundo y uno más largo al final: marcan la hora en punto.',
      look: 'En la cascada: puntos regulares, como las marcas de un reloj.' },
    { id: 'tuning', icon: '🎛️', name: 'Portadora (silbido)', tune: '7100lsb',
      what: 'Un silbido que sube o baja de tono. Es una señal sin modular mientras alguien gira el dial.',
      look: 'En la cascada: una línea que se inclina hacia un lado.' },
    { id: 'qrn', icon: '⛈️', name: 'Estática (QRN)', tune: '3700lsb',
      what: 'Ruido de fondo con chasquidos. Son tormentas, a veces a cientos de kilómetros.',
      look: 'En la cascada: manchas horizontales que cruzan todo el ancho de golpe.' },
    { id: 'buzz', icon: '🔌', name: 'Interferencia (QRM)', tune: '7100lsb',
      what: 'Un zumbido áspero. Suele venir de cargadores, LED o fuentes baratas de casa.',
      look: 'En la cascada: muchas rayas verticales a la misma distancia, como un peine.' },
  ];

  let ctx, master, analyser, playing = [], timer = null, raf = null;

  function audio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.2;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(analyser).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, len, level = 0.3, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g).connect(master);
    const r = 0.004;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + r);
    g.gain.setValueAtTime(level, start + len - r);
    g.gain.linearRampToValueAtTime(0, start + len);
    o.start(start); o.stop(start + len + 0.02);
    playing.push(o);
    return o;
  }

  function noise(start, len, level = 0.03, crackles = false) {
    const n = Math.ceil(ctx.sampleRate * len);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let burst = 0;
    for (let i = 0; i < n; i++) {
      if (crackles && Math.random() < 0.00012) burst = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.05));
      const b = burst-- > 0 ? 6 * Math.random() : 1;
      d[i] = (Math.random() * 2 - 1) * b;
    }
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; bp.type = 'lowpass'; bp.frequency.value = 3000; g.gain.value = level;
    src.connect(bp).connect(g).connect(master);
    src.start(start); src.stop(start + len);
    playing.push(src);
  }

  // Morse con el mismo código que js/morse.js
  function keyer(text, start, wpm, freq, level = 0.3) {
    const dot = 1.2 / wpm;
    let t = start;
    for (const ch of text.toUpperCase()) {
      if (ch === ' ') { t += dot * 4; continue; }
      const code = Morse.CODE[ch]; if (!code) continue;
      for (const s of code) { const len = s === '.' ? dot : dot * 3; tone(freq, t, len, level); t += len + dot; }
      t += dot * 2;
    }
    return t;
  }

  const SYNTH = {
    cw(t) { noise(t, 9, 0.02); return keyer('CQ CQ DE EA4ZZ EA4ZZ K', t + 0.3, 20, 700); },
    ft8(t) {
      noise(t, 13.5, 0.02);
      [[700, 0.12], [1180, 0.2], [1630, 0.08], [2210, 0.15]].forEach(([base, lvl]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = base; g.gain.value = 0;
        o.connect(g).connect(master);
        const s = t + 0.5 + Math.random() * 0.3;
        for (let k = 0; k < 79; k++) o.frequency.setValueAtTime(base + Math.floor(Math.random() * 8) * 6.25, s + k * 0.16);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(lvl, s + 0.05);
        g.gain.setValueAtTime(lvl, s + 12.6); g.gain.linearRampToValueAtTime(0, s + 12.65);
        o.start(s); o.stop(s + 12.7); playing.push(o);
      });
      return t + 13.5;
    },
    rtty(t) {
      noise(t, 7, 0.02);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 1275; g.gain.value = 0.25;
      o.connect(g).connect(master);
      const bit = 1 / 45.45;
      for (let k = 0, s = t + 0.3; s < t + 6.5; k++, s += bit) o.frequency.setValueAtTime(Math.random() < 0.5 ? 1275 : 1445, s);
      o.start(t + 0.3); o.stop(t + 6.6); playing.push(o);
      return t + 7;
    },
    beacon(t) {
      noise(t, 10.5, 0.02);
      let e = keyer('4U1UN', t + 0.3, 22, 800, 0.32) + 0.4;
      [0.32, 0.11, 0.035, 0.012].forEach(l => { tone(800, e, 1.0, l); e += 1.25; });
      return e + 0.3;
    },
    pips(t) {
      noise(t, 7, 0.015);
      for (let k = 0; k < 5; k++) tone(1000, t + 0.5 + k, 0.1, 0.3);
      tone(1000, t + 5.5, 0.5, 0.3);
      return t + 6.5;
    },
    tuning(t) {
      noise(t, 6, 0.02);
      const o = tone(400, t + 0.2, 5.4, 0.22);
      o.frequency.setValueAtTime(400, t + 0.2);
      o.frequency.exponentialRampToValueAtTime(2200, t + 3);
      o.frequency.exponentialRampToValueAtTime(900, t + 5.6);
      return t + 6;
    },
    qrn(t) { noise(t, 7, 0.06, true); return t + 7; },
    buzz(t) {
      noise(t, 6, 0.015);
      for (let h = 1; h <= 28; h++) tone(100 * h, t + 0.2, 5.5, 0.05 / Math.sqrt(h), 'sawtooth');
      return t + 6;
    },
  };

  /* ---------- Cascada ---------- */
  const canvas = $('waterfall');
  const g2 = canvas.getContext('2d');
  const MAXF = 3000;
  function color(v) { // 0..255 → gris oscuro → menta → amarillo
    const x = v / 255;
    if (x < 0.35) return [17 + x * 60, 18 + x * 80, 22 + x * 90];
    if (x < 0.7) { const k = (x - 0.35) / 0.35; return [38 + k * 101, 46 + k * 178, 54 + k * 140]; }
    const k = (x - 0.7) / 0.3; return [139 + k * 116, 224 - k * 14, 194 - k * 72];
  }
  function clear() {
    g2.fillStyle = '#111214'; g2.fillRect(0, 0, canvas.width, canvas.height);
  }
  function draw() {
    const w = canvas.width, h = canvas.height;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    const img = g2.getImageData(0, 0, w, h - 1);
    g2.putImageData(img, 0, 1);
    const row = g2.createImageData(w, 1);
    const hzPerBin = ctx.sampleRate / analyser.fftSize;
    for (let x = 0; x < w; x++) {
      const v = bins[Math.min(bins.length - 1, Math.round((x / w) * MAXF / hzPerBin))];
      const [r, gg, b] = color(Math.max(0, v - 60) * 1.35);
      row.data.set([r, gg, b, 255], x * 4);
    }
    g2.putImageData(row, 0, 0);
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    playing.forEach(n => { try { n.stop(); } catch (e) {} });
    playing = [];
    clearTimeout(timer);
    document.querySelectorAll('.sound-card').forEach(c => c.classList.remove('on'));
    $('soundNow').textContent = 'Elige un sonido para oírlo y verlo';
  }

  function play(s) {
    audio();
    stop();
    if (!raf) { clear(); draw(); }
    const end = SYNTH[s.id](ctx.currentTime + 0.05);
    document.querySelector(`.sound-card[data-id="${s.id}"]`).classList.add('on');
    document.dispatchEvent(new CustomEvent('radio:event', { detail: { name: 'sound', id: s.id } }));
    $('soundNow').textContent = `▶ ${s.name}`;
    $('soundInfo').innerHTML = `<h3>${s.icon} ${s.name}</h3><p>${s.what}</p><p class="look">${s.look}</p>
      <a class="btn small ghost" href="${WEBSDR + s.tune}" target="_blank" rel="noopener">🎧 Búscalo en un receptor de verdad</a>`;
    timer = setTimeout(stop, (end - ctx.currentTime) * 1000 + 200);
  }

  $('soundGrid').innerHTML = SOUNDS.map(s =>
    `<button class="sound-card" data-id="${s.id}"><span class="ico">${s.icon}</span><span>${s.name}</span></button>`).join('');
  $('soundGrid').addEventListener('click', e => {
    const b = e.target.closest('.sound-card'); if (!b) return;
    const s = SOUNDS.find(x => x.id === b.dataset.id);
    if (b.classList.contains('on')) stop(); else play(s);
  });
  $('soundStop').addEventListener('click', stop);
  clear();
})();
