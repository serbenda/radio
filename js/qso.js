// Simulador de primer contacto (QSO) con una estación virtual y tarjeta QSL descargable.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const letters = n => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

  // Estaciones virtuales hispanohablantes (indicativo generado al azar en cada contacto)
  const STATIONS = [
    { prefix: 'EA8', country: 'Canarias', op: 'Carmen', city: 'Santa Cruz de Tenerife', tz: 'Atlantic/Canary', lang: 'es-ES', flag: '🇮🇨' },
    { prefix: 'LU1', country: 'Argentina', op: 'Ricardo', city: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', lang: 'es-AR', flag: '🇦🇷' },
    { prefix: 'XE1', country: 'México', op: 'Lupita', city: 'Guadalajara', tz: 'America/Mexico_City', lang: 'es-MX', flag: '🇲🇽' },
    { prefix: 'CE3', country: 'Chile', op: 'Andrés', city: 'Valparaíso', tz: 'America/Santiago', lang: 'es-CL', flag: '🇨🇱' },
    { prefix: 'HK4', country: 'Colombia', op: 'Jorge', city: 'Medellín', tz: 'America/Bogota', lang: 'es-CO', flag: '🇨🇴' },
    { prefix: 'CO2', country: 'Cuba', op: 'Yoel', city: 'La Habana', tz: 'America/Havana', lang: 'es-US', flag: '🇨🇺' },
  ];

  const spell = call => call.split('').map(c => PHONETIC[c] || c).join(' ');
  const say = call => `${call} (${spell(call)})`;

  let me, dx, band, freq, mode, rst = '59', log, sending = false;

  /* ---------- Audio: voz + ruido de banda ---------- */
  let ctx, noiseGain;
  function startNoise() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (noiseGain) return;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.7;
      noiseGain = ctx.createGain(); noiseGain.gain.value = 0;
      src.connect(bp).connect(noiseGain).connect(ctx.destination);
      src.start();
    } catch (e) { /* sin audio */ }
  }
  function noise(level) { if (noiseGain) noiseGain.gain.setTargetAtTime(level, ctx.currentTime, 0.08); }
  function stopNoise() { noise(0); }

  function voiceFor(lang) {
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('es'));
    return vs.find(v => v.lang === lang) || vs.find(v => v.lang === 'es-ES') || vs[0] || null;
  }
  function speak(text) {
    return new Promise(resolve => {
      if (!$('qsoVoice').checked || !('speechSynthesis' in window)) { setTimeout(resolve, 900); return; }
      const u = new SpeechSynthesisUtterance(text.replace(/\(([^)]*)\)/g, ', $1,'));
      u.lang = dx.lang; u.rate = 1.02; u.pitch = 1;
      const v = voiceFor(dx.lang); if (v) u.voice = v;
      u.onend = u.onerror = resolve;
      noise(0.05);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setTimeout(resolve, 20000); // por si el navegador no avisa del final
    }).then(() => noise(0.012));
  }

  /* ---------- Registro de la conversación ---------- */
  function add(who, html) {
    const li = document.createElement('li');
    li.className = who;
    const label = { rx: `${dx.flag} ${dx.call}`, tx: `🎙️ ${me.call}`, info: '📻' }[who];
    li.innerHTML = `<span class="who">${esc(label)}</span><p>${html}</p>`;
    $('qsoLog').appendChild(li);
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    log.push(li);
    return li;
  }

  async function receive(text) {
    sending = true;
    $('qsoChoices').innerHTML = '';
    $('qsoRadio').classList.add('rx');
    $('qsoOnAir').textContent = 'RECIBIENDO';
    const li = add('rx', '<em>· · ·</em>');
    await new Promise(r => setTimeout(r, 700));
    li.querySelector('p').innerHTML = esc(text);
    await speak(text);
    $('qsoRadio').classList.remove('rx');
    $('qsoOnAir').textContent = 'TU TURNO';
    sending = false;
  }

  function choose(options) {
    const box = $('qsoChoices');
    box.innerHTML = '<p class="qso-ask">¿Qué transmites?</p>' + options.map((o, i) =>
      `<button class="opt wide" data-i="${i}">${esc(o.text)}</button>`).join('') + '<p class="qso-tip" id="qsoTip"></p>';
    return new Promise(resolve => {
      box.onclick = e => {
        const b = e.target.closest('.opt');
        if (!b || sending) return;
        const o = options[+b.dataset.i];
        if (!o.ok) {
          b.classList.add('wrong'); b.disabled = true;
          $('qsoTip').innerHTML = '✋ ' + esc(o.why);
          return;
        }
        box.onclick = null;
        box.innerHTML = '';
        add('tx', esc(o.text));
        if (o.why) add('info', esc(o.why));
        resolve();
      };
    });
  }

  /* ---------- El guion del contacto ---------- */
  async function run() {
    const theirName = dx.op, call = me.call, them = dx.call;
    const rstMe = pick(['5 y 7', '5 y 8', '5 y 9']);
    rst = rstMe.replace(' y ', '');
    const theirTime = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: dx.tz }).format(new Date());

    add('info', `Sintonizas ${freq} MHz en ${band}. Antes de llamar, escuchas un rato: parece libre.`);
    await choose([
      { ok: true, text: '¿QRL? ¿Está ocupada la frecuencia?', why: 'Bien hecho: siempre se pregunta antes de llamar, por si alguien la está usando y no le oyes.' },
      { ok: false, text: '¡Hola a todos! ¿Alguien me oye?', why: 'Así no se identifica nadie. Antes de nada, pregunta si la frecuencia está libre.' },
      { ok: false, text: 'Mayday, mayday, mayday…', why: '¡Ojo! “Mayday” es solo para emergencias reales con vidas en peligro.' },
    ]);
    add('info', 'Silencio. Nadie contesta: la frecuencia está libre.');

    await choose([
      { ok: true, text: `CQ CQ CQ, aquí ${say(call)}, ${call}, llamando general y a la escucha.`, why: '“CQ” es una llamada general. Deletrear tu indicativo con el alfabeto fonético evita confusiones.' },
      { ok: false, text: `CQ, aquí ${me.name}, ¿alguien quiere hablar?`, why: 'Por radio no vale el nombre: hay que dar el indicativo, y mejor deletreado.' },
      { ok: false, text: '¿Hay alguien en Argentina? Llamo solo a Argentina.', why: 'Se puede llamar a una zona concreta (“CQ DX”), pero para empezar lo normal es una llamada general.' },
    ]);
    await new Promise(r => setTimeout(r, 1200));
    await receive(`${call}, ${call}, aquí ${say(them)}. Cambio.`);
    add('info', `¡Te contesta ${dx.country}! Ahora te toca dar el control de señal, tu nombre y tu QTH (dónde estás).`);

    await choose([
      { ok: true, text: `${them}, aquí ${call}. Gracias por responder. Te recibo 5 y 9. Mi nombre es ${me.name}, ${me.name}, y mi QTH es ${me.city}. ¿Cómo me copias? ${them} de ${call}, cambio.`, why: '“5 y 9” es el control RS: 5 de legibilidad (perfecta) y 9 de intensidad (muy fuerte).' },
      { ok: false, text: 'Hola, ¿quién eres? Cuéntame cosas.', why: 'Primero identifícate y da los datos básicos: control de señal, nombre y QTH.' },
      { ok: false, text: `${them}, te recibo 10 de 10, ¡perfecto!`, why: 'El control de señal tiene su escala: legibilidad del 1 al 5 e intensidad del 1 al 9. Lo máximo es “5 y 9”.' },
    ]);
    await receive(`${call} de ${them}. Muchas gracias, ${me.name}. Te copio ${rstMe}, buena señal hasta ${dx.country}. Mi nombre es ${theirName}, ${theirName}, y estoy en ${dx.city}. Aquí son las ${theirTime}. Trabajo con 100 vatios y un dipolo. Es un placer, bienvenido a la banda. ${call} de ${them}, cambio.`);

    await choose([
      { ok: true, text: `Recibido, ${theirName}, todo copiado. Te confirmo el contacto con QSL. Muchas gracias por el QSO. 73. ${them} de ${call}.`, why: '“73” son saludos cordiales. Y siempre te identificas al terminar.' },
      { ok: false, text: 'Vale, adiós.', why: 'Despídete bien: agradece, manda 73 y di tu indicativo al cerrar.' },
      { ok: false, text: '¿Y qué te parece el gobierno? Yo creo que…', why: 'En el aire se evitan la política y la religión: es una comunidad de todo el mundo.' },
    ]);
    await receive(`Recibido, ${me.name}. Te mando mi QSL. 73 y buenos DX. ${call} de ${them}, sigo a la escucha.`);
    stopNoise();
    $('qsoOnAir').textContent = 'QSO COMPLETO';
    add('info', `🎉 ¡Has completado tu primer QSO con ${dx.country}! Te ha llegado su tarjeta QSL.`);
    setTimeout(showQsl, 900);
  }

  /* ---------- Tarjeta QSL ---------- */
  async function showQsl() {
    if (document.fonts) await document.fonts.ready;
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 16);
    const c = $('qslCanvas'), g = c.getContext('2d');
    const W = c.width, H = c.height;
    const ink = '#f2f2f4', mint = '#8be0c2', muted = '#9c9ea6';

    g.fillStyle = '#16171a'; g.fillRect(0, 0, W, H);
    // ondas decorativas
    g.strokeStyle = 'rgba(139,224,194,.12)'; g.lineWidth = 2;
    for (let r = 60; r < 700; r += 46) { g.beginPath(); g.arc(W - 90, 90, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = mint; g.lineWidth = 3; g.strokeRect(18, 18, W - 36, H - 36);

    g.fillStyle = mint; g.font = '600 18px "IBM Plex Mono", monospace';
    g.fillText(`${dx.country.toUpperCase()} · ${dx.city.toUpperCase()}`, 52, 76);
    g.fillStyle = ink; g.font = '800 104px Fraunces, Georgia, serif';
    g.fillText(dx.call, 46, 180);
    g.font = '400 24px "IBM Plex Sans", sans-serif'; g.fillStyle = muted;
    g.fillText(`Operador: ${dx.op}`, 52, 222);

    g.fillStyle = ink; g.font = '600 26px "IBM Plex Sans", sans-serif';
    g.fillText(`Para: ${me.call} · ${me.name} (${me.city})`, 52, 290);
    g.fillStyle = muted; g.font = '400 20px "IBM Plex Sans", sans-serif';
    g.fillText('Confirmando nuestro QSO:', 52, 326);

    const cols = [['FECHA', date], ['UTC', time], ['BANDA', band], ['MHz', freq], ['MODO', mode], ['RST', rst]];
    const x0 = 52, y0 = 352, weights = [1.7, 1, 1, 1.15, 0.95, 0.8];
    const unit = (W - 104) / weights.reduce((a, b) => a + b, 0);
    g.strokeStyle = '#3a3d44'; g.lineWidth = 1.5;
    let x = x0;
    cols.forEach(([k, v], i) => {
      const cw = weights[i] * unit;
      g.strokeRect(x, y0, cw, 92);
      g.fillStyle = muted; g.font = '600 14px "IBM Plex Mono", monospace'; g.fillText(k, x + 14, y0 + 28);
      g.fillStyle = ink; g.font = '600 22px "IBM Plex Mono", monospace'; g.fillText(v, x + 14, y0 + 68);
      x += cw;
    });

    g.fillStyle = mint; g.font = 'italic 800 40px Fraunces, Georgia, serif';
    g.fillText('Tnx QSO · 73!', 52, 506);
    g.fillStyle = muted; g.font = '400 15px "IBM Plex Mono", monospace';
    g.textAlign = 'right'; g.fillText('Contacto simulado · bendi.dev/radio', W - 52, 506); g.textAlign = 'left';

    $('qsoQsl').hidden = false;
    $('qsoQsl').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('qslDownload').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `QSL_${dx.call}_${me.call}.png`;
    a.href = $('qslCanvas').toDataURL('image/png');
    a.click();
  });

  /* ---------- Inicio ---------- */
  function start(e) {
    e.preventDefault();
    const callIn = $('qsoCall').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,8}$/.test(callIn) || !/\d/.test(callIn)) {
      $('qsoCall').setCustomValidity('Un indicativo lleva letras y al menos un número, por ejemplo EA4ABC.');
      $('qsoCall').reportValidity();
      return;
    }
    me = { name: $('qsoName').value.trim(), city: $('qsoCity').value.trim(), call: callIn };
    const st = pick(STATIONS);
    dx = { ...st, call: st.prefix + letters(pick([2, 3])) };
    const h = new Date().getUTCHours();
    const day = h >= 8 && h < 18;
    band = day ? '20 m' : '40 m';
    mode = day ? 'USB' : 'LSB';
    freq = (day ? 14.150 + Math.random() * 0.14 : 7.090 + Math.random() * 0.09).toFixed(3);
    log = [];
    $('qsoLog').innerHTML = '';
    $('qsoFreq').textContent = `${freq} MHz · ${mode}`;
    $('qsoOnAir').textContent = 'EN EL AIRE';
    $('qsoSetup').hidden = true;
    $('qsoQsl').hidden = true;
    $('qsoRadio').hidden = false;
    startNoise(); noise(0.012);
    run();
  }

  $('qsoCall').addEventListener('input', () => {
    $('qsoCall').setCustomValidity('');
    const v = $('qsoCall').value.toUpperCase();
    if (v !== $('qsoCall').value) $('qsoCall').value = v;
  });
  $('qsoSetup').addEventListener('submit', start);
  $('qsoAgain').addEventListener('click', () => {
    stopNoise(); if ('speechSynthesis' in window) speechSynthesis.cancel();
    $('qsoRadio').hidden = true; $('qsoQsl').hidden = true; $('qsoSetup').hidden = false;
    $('qsoSetup').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  if ('speechSynthesis' in window) speechSynthesis.getVoices(); // precarga de voces
})();
