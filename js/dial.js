/**
 * dial.js · Dial de onda corta de la portada.
 *
 * Página: Inicio (#inicio). Necesita: #dialScale, #dialNeedle, #dialKnob, #dialFreq, #dialBand, #wavePath.
 *   #dialKnob es un <input type="range" min="0" max="1000">: su valor es la posición (0 a 1000) a lo largo
 *   de la escala, no la frecuencia. #wavePath es el <path> de un SVG con viewBox="0 0 400 60".
 * Datos: DIAL_BANDS (data.js). Depende de: Radio ($, whileVisible, reducedMotion) de core.js.
 *
 * Qué hace:
 *  - Recorre la onda corta de 1,8 a 30 MHz en escala logarítmica (las bandas bajas no quedan apelotonadas).
 *  - Dice en qué banda estás y cómo se comporta a esta hora (regla sencilla día/noche).
 *  - Dibuja una "señal" en el dial: limpia dentro de una banda, ruido fuera.
 *
 * Rendimiento: la animación solo corre mientras el dial está en pantalla y la pestaña visible
 * (Radio.whileVisible), a unos 16 fotogramas por segundo, y no corre si el sistema pide reducir movimiento.
 * Accesibilidad: el control deslizante anuncia la frecuencia y la banda con aria-valuetext.
 * No guarda nada, no emite eventos y no usa servicios externos.
 *
 * Cómo modificarlo:
 *  - Cambiar el comportamiento de una banda a esta hora: textos y grupos de bandas de mood().
 *  - Cambiar el horario de "día": isDay() (de 8:00 a 18:59, hora local del dispositivo).
 *  - Ampliar el rango del dial: F_MIN y F_MAX (en MHz); las bandas salen de DIAL_BANDS, así que una banda
 *    'hf' nueva en BANDS aparece sola en la escala.
 *  - Frecuencia de arranque: la línea `knob.value = …pos(7.1)…` (7,1 MHz, banda de 40 m).
 */
(() => {
  'use strict';
  const { $ } = Radio;
  const knob = $('dialKnob');
  if (!knob) return;

  /* ---------- Escala logarítmica ---------- */
  // Extremos del dial en MHz.
  const F_MIN = 1.8, F_MAX = 30;
  /**
   * Posición en la escala (0 = izquierda, 1 = derecha) de una frecuencia, en escala logarítmica:
   * p = log(f / F_MIN) / log(F_MAX / F_MIN). Cada vez que la frecuencia se multiplica por lo mismo, la aguja
   * avanza lo mismo; así de 1,8 a 3,6 MHz ocupa tanto como de 15 a 30 MHz.
   * @param {number} f  Frecuencia en MHz.
   * @returns {number} Posición entre 0 y 1 (fuera de ese rango si f está fuera del dial).
   */
  const pos = f => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
  /**
   * Inversa de pos(): frecuencia que corresponde a una posición. f = F_MIN · (F_MAX / F_MIN)^p.
   * @param {number} p  Posición entre 0 y 1.
   * @returns {number} Frecuencia en MHz.
   */
  const freqAt = p => F_MIN * Math.pow(F_MAX / F_MIN, p);
  /**
   * Regla sencilla de día o noche con la hora local del dispositivo (no la del sitio que se escucha).
   * @returns {boolean} true entre las 8:00 y las 18:59.
   */
  const isDay = () => { const h = new Date().getHours(); return h >= 8 && h < 19; };

  // Marcas de las bandas en la escala (la de 12 m va sin etiqueta para que no se pise con la de 10 m)
  // left y width en % del ancho del dial. Ancho mínimo 0,8 % para que las bandas estrechas (30 m) se vean.
  // La etiqueta es el número sin " m" ("40 m" → "40") para que quepa.
  $('dialScale').innerHTML = DIAL_BANDS.map(b =>
    `<span class="mark" style="left:${(pos(b.from) * 100).toFixed(2)}%;width:${Math.max(0.8, (pos(b.to) - pos(b.from)) * 100).toFixed(2)}%">${b.name === '12 m' ? '' : `<b>${b.name.replace(' m', '')}</b>`}</span>`
  ).join('');

  /**
   * Frase corta sobre cómo suele estar una banda a esta hora. Simplificación para principiantes:
   * bandas bajas (160 y 80 m) abren de noche; altas (20 a 10 m) de día; el resto (40 y 30 m) siempre
   * algo, con más alcance de noche.
   * @param {{name:string}} b  Banda de DIAL_BANDS (se compara por su nombre exacto).
   * @returns {string} Texto que se añade tras el nombre de la banda.
   */
  function mood(b) {
    const day = isDay();
    if (['160 m', '80 m'].includes(b.name)) return day ? 'de día, poco que oír' : 'ahora: abierta, charlas cercanas';
    if (['20 m', '17 m', '15 m', '12 m', '10 m'].includes(b.name)) return day ? 'ahora: abierta, DX lejano' : 'de noche suele cerrarse';
    return day ? 'ahora: España y vecinos' : 'ahora: Europa entera';
  }

  /* ---------- Sintonía ---------- */
  // true si la aguja está dentro de una banda; decide si la señal dibujada es limpia o solo ruido.
  let inBand = false;
  /**
   * Lee el control deslizante y actualiza la aguja, la frecuencia, la banda y su descripción.
   * Se llama en cada movimiento del control (evento input) y una vez al cargar.
   * Efectos: posición de #dialNeedle, textos de #dialFreq y #dialBand (clase "hot" si está en banda),
   *   aria-valuetext de #dialKnob y, si la animación está parada, redibuja la señal una vez.
   * Fuera de banda indica la banda más cercana, comparando distancias en la escala logarítmica
   * hasta el inicio (`from`) de cada banda.
   */
  function update() {
    // Valor 0-1000 del control → posición 0-1 → frecuencia en MHz.
    const p = knob.value / 1000, f = freqAt(p);
    $('dialNeedle').style.left = (p * 100) + '%';
    // Tres decimales de MHz = resolución de 1 kHz.
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
    // Los lectores de pantalla leen este texto en lugar del número 0-1000 del control.
    knob.setAttribute('aria-valuetext', `${f.toFixed(3)} megahercios, ${text}`);
    if (!running) drawWave(); // con la animación parada, al menos refleja el cambio
  }

  // Señal dibujada en el dial
  const wave = $('wavePath');
  // phase: desplazamiento de la onda entre fotogramas (en radianes); running: la animación está en marcha;
  // timer: el setTimeout pendiente, para poder pararlo.
  let phase = 0, running = false, timer = null;
  /**
   * Dibuja un fotograma de la señal en #wavePath (coordenadas del viewBox: 400 de ancho, 60 de alto,
   * línea base en y = 30).
   * - env: envolvente sen(π·x/400), vale 0 en los bordes y 1 en el centro, para que la línea empiece y acabe plana.
   * - sig: dentro de banda, una senoidal de amplitud 16 (periodo de unas 57 unidades: x/9 rad); fuera, nada.
   * - noise: ruido aleatorio de ±2 dentro de banda y ±9 fuera, así fuera de banda solo se ve "estática".
   * Un punto cada 4 unidades (101 puntos) basta para que parezca continua.
   * Efectos: atributo d de #wavePath, clase "clear" en el SVG y avanza `phase` 0,25 rad.
   */
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
  /**
   * Bucle de animación: un fotograma cada ~60 ms (unos 16 por segundo; el dibujo no necesita más y así
   * gasta menos batería). setTimeout marca el ritmo y requestAnimationFrame hace que se dibuje en el
   * momento en que el navegador pinta (y que no corra en pestañas ocultas).
   */
  const loop = () => { drawWave(); timer = setTimeout(() => requestAnimationFrame(loop), 60); };

  knob.addEventListener('input', update);
  // pos(7.1) · 1000: valor del control que corresponde a 7,1 MHz.
  knob.value = Math.round(pos(7.1) * 1000); // arranca en 40 m
  update();

  // Con "reducir movimiento" la señal no se anima: solo se redibuja al mover el dial (desde update()).
  if (!Radio.reducedMotion) {
    Radio.whileVisible($('inicio'),
      () => { running = true; loop(); },
      () => { running = false; clearTimeout(timer); });
  }
})();
