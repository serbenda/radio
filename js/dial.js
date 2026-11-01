/**
 * dial.js · Dial de onda corta de la portada.
 *
 * Página: Inicio (#inicio). Necesita: #dialScale, #dialNeedle, #dialKnob, #dialFreq, #dialBand, #wavePath.
 * Datos: DIAL_BANDS (data.js).
 *
 * Qué hace:
 *  - Recorre la onda corta de 1,8 a 30 MHz en escala logarítmica (las bandas bajas no quedan apelotonadas).
 *  - Dice en qué banda estás y cómo se comporta a esta hora (regla sencilla día/noche).
 *  - Dibuja una "señal" en el dial: limpia dentro de una banda, ruido fuera.
 *
 * Rendimiento: la animación solo corre mientras el dial está en pantalla y la pestaña visible
 * (Radio.whileVisible), a unos 16 fotogramas por segundo, y no corre si el sistema pide reducir movimiento.
 * Accesibilidad: el control deslizante anuncia la frecuencia y la banda con aria-valuetext.
 */
(() => {
  'use strict';
  const { $ } = Radio;
  const knob = $('dialKnob');
  if (!knob) return;

  const F_MIN = 1.8, F_MAX = 30;
  const pos = f => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
  const freqAt = p => F_MIN * Math.pow(F_MAX / F_MIN, p);
  const isDay = () => { const h = new Date().getHours(); return h >= 8 && h < 19; };

  // Marcas de las bandas en la escala (la de 12 m va sin etiqueta para que no se pise con la de 10 m)
  $('dialScale').innerHTML = DIAL_BANDS.map(b =>
    `<span class="mark" style="left:${(pos(b.from) * 100).toFixed(2)}%;width:${Math.max(0.8, (pos(b.to) - pos(b.from)) * 100).toFixed(2)}%">${b.name === '12 m' ? '' : `<b>${b.name.replace(' m', '')}</b>`}</span>`
  ).join('');

  function mood(b) {
    const day = isDay();
    if (['160 m', '80 m'].includes(b.name)) return day ? 'de día, poco que oír' : 'ahora: abierta, charlas cercanas';
    if (['20 m', '17 m', '15 m', '12 m', '10 m'].includes(b.name)) return day ? 'ahora: abierta, DX lejano' : 'de noche suele cerrarse';
    return day ? 'ahora: España y vecinos' : 'ahora: Europa entera';
  }

  let inBand = false;
  function update() {
    const p = knob.value / 1000, f = freqAt(p);
    $('dialNeedle').style.left = (p * 100) + '%';
    $('dialFreq').textContent = f.toFixed(3);
    const band = DIAL_BANDS.find(b => f >= b.from && f <= b.to);
    inBand = !!band;
    let text;
    if (band) text = `${band.name} · ${mood(band)}`;
    else {
      const near = DIAL_BANDS.reduce((a, b) => (Math.abs(pos(b.from) - p) < Math.abs(pos(a.from) - p) ? b : a));
      text = `fuera de banda · la más cercana: ${near.name}`;
    }
    $('dialBand').textContent = text;
    $('dialBand').classList.toggle('hot', inBand);
    knob.setAttribute('aria-valuetext', `${f.toFixed(3)} megahercios, ${text}`);
    if (!running) drawWave(); // con la animación parada, al menos refleja el cambio
  }

  // Señal dibujada en el dial
  const wave = $('wavePath');
  let phase = 0, running = false, timer = null;
  function drawWave() {
    const pts = [];
    for (let x = 0; x <= 400; x += 4) {
      const env = Math.sin((x / 400) * Math.PI);
      const sig = inBand ? Math.sin(x / 9 + phase) * 16 * env : 0;
      const noise = (Math.random() - 0.5) * (inBand ? 4 : 18) * env;
      pts.push(`${x},${(30 + sig + noise).toFixed(1)}`);
    }
    wave.setAttribute('d', 'M' + pts.join(' L'));
    wave.parentNode.classList.toggle('clear', inBand);
    phase += 0.25;
  }
  const loop = () => { drawWave(); timer = setTimeout(() => requestAnimationFrame(loop), 60); };

  knob.addEventListener('input', update);
  knob.value = Math.round(pos(7.1) * 1000); // arranca en 40 m
  update();

  if (!Radio.reducedMotion) {
    Radio.whileVisible($('inicio'),
      () => { running = true; loop(); },
      () => { running = false; clearTimeout(timer); });
  }
})();
