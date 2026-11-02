/**
 * spectrum.js · Página Espectro: mapa del espectro por usos y galería "Así suenan" de señales de redes.
 *
 * Página: Espectro (espectro/ y en/spectrum/).
 * Necesita:
 *  - Mapa: #specMap (contenedor de filas), #specDetail (ficha de la franja elegida, aria-live).
 *  - Señales: #sigGrid (botones), #sigInfo (ficha), #sigFall (canvas de la cascada), #sigNow, #sigStop.
 * Cada parte se activa solo si encuentra sus elementos.
 * Depende de: core.js (Radio.t, Radio.esc, Radio.emit, Radio.track no se usa). No usa servicios externos.
 * No guarda nada en localStorage.
 *
 * Mapa del espectro:
 *  - BANDS: [categoría, desde MHz, hasta MHz, nombre, explicación, enlace]. Escala logarítmica de 0,1 a 12.000 MHz
 *    (x = (log10 f − log10 0,1) / (log10 12000 − log10 0,1)). Las franjas muy estrechas se ensanchan a 0,6 %
 *    para que se puedan pulsar.
 *  - Cada franja es un <button> con aria-label completo; al pulsarla se pinta su ficha en #specDetail.
 *  - Los colores de cada categoría están en CATS (y en las clases .cat-<id> de css/style.css, sección 52).
 *
 * Señales ("Así suenan"):
 *  - Imitaciones de lo que sale por el altavoz de un receptor en FM al sintonizar cada sistema (no su contenido).
 *    Se generan muestra a muestra en un AudioBuffer (no con osciladores), porque son ruido y datos binarios:
 *    tetra (ruido continuo modulado a 17,6 Hz, el ritmo de sus tramas de 56,67 ms), dmr (ráfagas de 30 ms cada
 *    60 ms), pocsag (preámbulo 101010… y datos a 1.200 baudios), ais (ráfagas de 26,7 ms a 9.600 baudios),
 *    sonde (radiosonda RS41: 0,53 s de datos a 4.800 baudios cada segundo), apt (satélite NOAA: tono de 2.400 Hz
 *    con su "tic-tac" de 2 líneas por segundo) y fm (soplido del silenciador al abrir un canal vacío).
 *  - Cascada: AnalyserNode (fftSize 2048) de 0 a 6.000 Hz, misma paleta que sounds.js.
 *  - Logro: Radio.emit('signal', id) al reproducir.
 *
 * Cómo modificarlo:
 *  - Franja nueva en el mapa: una fila en BANDS (si es una categoría nueva, también en CATS y en el CSS).
 *  - Señal nueva: una entrada en SIGNALS (id, icon, name, freq, what, look, real) y una función con el mismo id
 *    en SYNTH que reciba la frecuencia de muestreo y devuelva un Float32Array con las muestras (−1…1).
 *  - Cambiar el rango de la cascada: MAXF.
 */
(() => {
  'use strict';
  const { t, esc } = Radio;
  const $ = id => document.getElementById(id);

  /* ---------- Mapa del espectro ---------- */
  const CATS = [
    ['dif', t('Radiodifusión', 'Broadcasting')],
    ['ham', t('Radioaficionados', 'Radio amateurs')],
    ['free', t('Sin licencia', 'Licence-free')],
    ['pro', t('Profesional y emergencias', 'Professional and emergency')],
    ['trans', t('Aviones y barcos', 'Aircraft and ships')],
    ['sky', t('Satélites y ciencia', 'Satellites and science')],
    ['tel', t('Telefonía y wifi', 'Mobile phones and wifi')]
  ];
  const AMATEUR = t('Banda de radioaficionado: solo con licencia para emitir; escuchar es libre.', 'Amateur band: a licence is needed to transmit; anyone may listen.');
  const S = '#'; // enlaces a secciones de esta misma página
  const BANDS_LINK = Radio.url('entender/#bandas');
  const BANDS = [
    ['dif', 0.1485, 0.2835, t('Onda larga', 'Long wave'), t('Pocas emisoras ya; viaja pegada al suelo cientos de kilómetros.', 'Few stations left; it travels along the ground for hundreds of kilometres.'), S + 'difusion'],
    ['dif', 0.5265, 1.6065, t('Onda media (AM)', 'Medium wave (AM)'), t('Emisoras nacionales y locales. De noche se oye media Europa.', 'National and local stations. At night you can hear half of Europe.'), S + 'difusion'],
    ['dif', 5.9, 6.2, t('Onda corta, 49 m', 'Shortwave, 49 m'), t('Emisoras internacionales que cruzan océanos rebotando en la ionosfera.', 'International stations that cross oceans by bouncing off the ionosphere.'), S + 'difusion'],
    ['dif', 7.2, 7.45, t('Onda corta, 41 m', 'Shortwave, 41 m'), t('Emisoras internacionales, sobre todo de tarde y noche.', 'International stations, mostly in the evening and at night.'), S + 'difusion'],
    ['dif', 9.4, 9.9, t('Onda corta, 31 m', 'Shortwave, 31 m'), t('La banda internacional más concurrida.', 'The busiest international band.'), S + 'difusion'],
    ['dif', 11.6, 12.1, t('Onda corta, 25 m', 'Shortwave, 25 m'), t('Emisoras internacionales de día.', 'International stations by day.'), S + 'difusion'],
    ['dif', 15.1, 15.8, t('Onda corta, 19 m', 'Shortwave, 19 m'), t('Emisoras internacionales de día, de muy lejos.', 'International stations by day, from very far away.'), S + 'difusion'],
    ['dif', 87.5, 108, 'FM', t('Música y noticias con buena calidad, hasta el horizonte.', 'Music and news in good quality, as far as the horizon.'), S + 'difusion'],
    ['dif', 174, 240, 'DAB+', t('Radio digital.', 'Digital radio.'), S + 'difusion'],
    ['dif', 470, 694, t('TDT', 'Digital TV'), t('Televisión digital terrestre.', 'Digital terrestrial television.'), S + 'difusion'],
    ['ham', 1.81, 2.0, t('160 m', '160 m'), AMATEUR, BANDS_LINK],
    ['ham', 3.5, 3.8, '80 m', AMATEUR + t(' Charlas regionales de noche.', ' Regional chats at night.'), BANDS_LINK],
    ['ham', 7.0, 7.2, '40 m', AMATEUR + t(' La banda de todo el día: España y Europa.', ' The all-day band: Spain and Europe.'), BANDS_LINK],
    ['ham', 14.0, 14.35, '20 m', AMATEUR + t(' La reina del DX: contactos con todo el mundo.', ' The queen of DX: contacts with the whole world.'), BANDS_LINK],
    ['ham', 21.0, 21.45, '15 m', AMATEUR, BANDS_LINK],
    ['ham', 28.0, 29.7, '10 m', AMATEUR + t(' Vecina de la CB: se abre en los años buenos del ciclo solar.', ' Next door to CB: it opens up in the good years of the solar cycle.'), BANDS_LINK],
    ['ham', 50, 52, '6 m', AMATEUR + t(' La "banda mágica": aperturas repentinas en verano.', ' The "magic band": sudden openings in summer.'), BANDS_LINK],
    ['ham', 144, 146, '2 m', AMATEUR + t(' Walkies, repetidores y satélites.', ' Handhelds, repeaters and satellites.'), BANDS_LINK],
    ['ham', 430, 440, '70 cm', AMATEUR + t(' Repetidores, voz digital y satélites.', ' Repeaters, digital voice and satellites.'), BANDS_LINK],
    ['ham', 1240, 1300, '23 cm', AMATEUR + t(' Televisión de aficionado y enlaces.', ' Amateur television and links.'), BANDS_LINK],
    ['ham', 10450, 10500, t('QO-100 (bajada)', 'QO-100 (downlink)'), t('El satélite geoestacionario de aficionado: siempre en el mismo sitio del cielo.', 'The geostationary amateur satellite: always in the same spot in the sky.'), Radio.url('entender/#satelites')],
    ['free', 26.96, 27.41, 'CB-27', t('40 canales de uso común, en AM, FM y banda lateral.', '40 common-use channels, in AM, FM and sideband.'), S + 'sin-licencia'],
    ['free', 433.05, 434.79, t('433 MHz', '433 MHz'), t('Mandos, sensores, estaciones meteorológicas caseras, walkies LPD.', 'Remote controls, sensors, home weather stations, LPD walkie-talkies.'), S + 'sin-licencia'],
    ['free', 446.0, 446.2, 'PMR446', t('Los walkies sin licencia: 16 canales analógicos y versiones digitales.', 'Licence-free walkie-talkies: 16 analogue channels and digital versions.'), S + 'sin-licencia'],
    ['free', 868, 870, t('868 MHz', '868 MHz'), t('Sensores, alarmas y dispositivos de baja potencia.', 'Sensors, alarms and low-power devices.'), S + 'sin-licencia'],
    ['free', 2400, 2483.5, t('Wifi y Bluetooth 2,4 GHz', 'Wifi and Bluetooth 2.4 GHz'), t('Sin licencia y abarrotada: wifi, Bluetooth, mandos, microondas.', 'Licence-free and crowded: wifi, Bluetooth, remotes, microwave ovens.'), S + 'sin-licencia'],
    ['free', 5150, 5875, t('Wifi 5 GHz', 'Wifi 5 GHz'), t('El wifi rápido.', 'Fast wifi.'), S + 'sin-licencia'],
    ['pro', 146, 174, t('PMR en VHF', 'VHF PMR'), t('Empresas, ayuntamientos, seguridad privada, en analógico y digital (DMR).', 'Businesses, councils, private security, analogue and digital (DMR).'), S + 'profesional'],
    ['pro', 380, 400, t('TETRA de emergencias', 'Emergency TETRA'), t('La banda que Europa reserva a la seguridad pública: redes TETRA y TETRAPOL, cifradas.', 'The band Europe reserves for public safety: TETRA and TETRAPOL networks, encrypted.'), S + 'profesional'],
    ['pro', 406.1, 470, t('PMR en UHF', 'UHF PMR'), t('Empresas, transporte, metros y aeropuertos (TETRA civil, DMR, dPMR).', 'Businesses, transport, metros and airports (civil TETRA, DMR, dPMR).'), S + 'profesional'],
    ['trans', 118, 137, t('Banda aérea', 'Airband'), t('Pilotos y controladores, en AM. 121,5 MHz: emergencia.', 'Pilots and controllers, in AM. 121.5 MHz: emergency.'), S + 'transporte'],
    ['trans', 156, 162.05, t('VHF marina y AIS', 'Marine VHF and AIS'), t('Canal 16 (156,800 MHz): socorro. AIS: posición de los barcos.', 'Channel 16 (156.800 MHz): distress. AIS: ship positions.'), S + 'transporte'],
    ['trans', 1087, 1093, 'ADS-B (1090 MHz)', t('Cada avión emite su posición, altura y velocidad.', 'Every aircraft broadcasts its position, altitude and speed.'), S + 'transporte'],
    ['sky', 137, 138, t('Satélites del tiempo', 'Weather satellites'), t('Imágenes de las nubes (Meteor-M). Los NOAA se apagaron en 2025.', 'Cloud images (Meteor-M). The NOAA satellites were switched off in 2025.'), S + 'cielo'],
    ['sky', 400.15, 406, t('Radiosondas', 'Radiosondes'), t('Globos meteorológicos que transmiten cada segundo mientras suben.', 'Weather balloons that transmit every second as they climb.'), S + 'cielo'],
    ['sky', 1563, 1587, t('GPS y Galileo', 'GPS and Galileo'), t('Señales de los satélites de navegación, por debajo del ruido.', 'Navigation satellite signals, below the noise floor.'), S + 'cielo'],
    ['tel', 703, 960, t('Móvil 700–900 MHz', 'Mobile 700–900 MHz'), t('Telefonía móvil 4G y 5G de largo alcance.', 'Long-range 4G and 5G mobile.'), S + 'ley'],
    ['tel', 1710, 2170, t('Móvil 1,8–2,1 GHz', 'Mobile 1.8–2.1 GHz'), t('Telefonía móvil 4G.', '4G mobile.'), S + 'ley'],
    ['tel', 2500, 2690, t('Móvil 2,6 GHz', 'Mobile 2.6 GHz'), t('Telefonía móvil de capacidad.', 'High-capacity mobile.'), S + 'ley'],
    ['tel', 3400, 3800, t('5G 3,5 GHz', '5G 3.5 GHz'), t('La banda principal del 5G.', 'The main 5G band.'), S + 'ley']
  ];
  const LO = Math.log10(0.1), HI = Math.log10(12000);
  const pos = f => (Math.log10(f) - LO) / (HI - LO) * 100;
  /**
   * Formatea una frecuencia en MHz como texto legible (kHz por debajo de 1 MHz, GHz por encima de 1.000).
   * @param {number} f  Frecuencia en MHz.
   * @returns {string}  Por ejemplo "531 kHz", "7,2 MHz", "2,4 GHz".
   */
  const fmt = f => {
    const n = (v, d) => v.toLocaleString(Radio.locale, { maximumFractionDigits: d });
    if (f < 1) return `${n(f * 1000, 1)} kHz`;
    if (f >= 1000) return `${n(f / 1000, 3)} GHz`;
    return `${n(f, 3)} MHz`;
  };

  const map = $('specMap'), detail = $('specDetail');
  if (map && detail) {
    map.innerHTML = CATS.map(([id, name]) => `<div class="spec-row cat-${id}"><span class="spec-label">${name}</span><div class="spec-track">${
      BANDS.map((b, i) => [b, i]).filter(([b]) => b[0] === id).map(([b, i]) => {
        const left = pos(b[1]), width = Math.max(0.6, pos(b[2]) - left);
        return `<button type="button" class="spec-band" data-i="${i}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%" aria-label="${esc(`${b[3]}: ${fmt(b[1])} – ${fmt(b[2])}`)}" title="${esc(b[3])}"></button>`;
      }).join('')}</div></div>`).join('');
    map.addEventListener('click', e => {
      const btn = e.target.closest('.spec-band');
      if (!btn) return;
      map.querySelectorAll('.spec-band[aria-pressed="true"]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const [cat, a, z, name, what, link] = BANDS[+btn.dataset.i];
      const catName = CATS.find(c => c[0] === cat)[1];
      // Textos propios (BANDS), no datos externos: se insertan tal cual salvo el nombre, que va escapado.
      detail.innerHTML = `<p class="spec-cat cat-${cat}">${catName}</p><h3>${esc(name)}</h3><p class="spec-range">${fmt(a)} – ${fmt(z)}</p><p>${what}</p><p><a href="${link}">${t('Más sobre esto →', 'More about this →')}</a></p>`;
    });
  }

  /* ---------- Señales: "Así suenan" ---------- */
  const grid = $('sigGrid'), info = $('sigInfo'), canvas = $('sigFall');
  if (!grid || !info || !canvas) return;
  const SEARCH = 'https://www.sigidwiki.com/index.php?search=';
  const SIGNALS = [
    { id: 'tetra', icon: '🚓', name: 'TETRA', freq: t('380–470 MHz · estación base', '380–470 MHz · base station'), real: 'https://www.sigidwiki.com/wiki/TETRA',
      what: t('Una estación base de una red TETRA: emite sin parar su canal de control, aunque nadie hable. Cuatro conversaciones se reparten cada canal en turnos.', 'A TETRA network base station: it transmits its control channel non-stop, even when nobody is talking. Four conversations share each channel in turns.'),
      look: t('Un zumbido áspero continuo, con un ligero temblor de unas 18 veces por segundo (sus tramas). En la cascada: un bloque ancho que nunca se apaga.', 'A continuous raspy buzz with a slight tremble about 18 times a second (its frames). On the waterfall: a wide block that never switches off.') },
    { id: 'dmr', icon: '📻', name: 'DMR', freq: t('VHF y UHF · walkies digitales', 'VHF and UHF · digital handhelds'), real: 'https://www.sigidwiki.com/wiki/DMR',
      what: t('Un walkie digital DMR hablando. Transmite a ráfagas de 30 milisegundos cada 60: el hueco es para una segunda conversación en el mismo canal.', 'A DMR digital handheld talking. It transmits in 30-millisecond bursts every 60: the gap is for a second conversation on the same channel.'),
      look: t('Un "motosierra" entrecortado mientras dura la frase. En la cascada: una franja ancha a rayas horizontales.', 'A stuttering "chainsaw" while the sentence lasts. On the waterfall: a wide stripe with horizontal bars.') },
    { id: 'pocsag', icon: '📟', name: t('POCSAG (buscas)', 'POCSAG (pagers)'), freq: t('VHF y UHF · hospitales', 'VHF and UHF · hospitals'), real: SEARCH + 'POCSAG',
      what: t('Un mensaje a los buscapersonas que aún se usan en hospitales y servicios técnicos. Empieza con un preámbulo de unos y ceros alternos y sigue con los datos a 1.200 bits por segundo.', 'A message to the pagers still used in hospitals and technical services. It starts with a preamble of alternating ones and zeros and continues with data at 1,200 bits per second.'),
      look: t('Un tono limpio y después un "brrrrt" áspero. En la cascada: una raya fina que se convierte en una mancha.', 'A clean tone, then a harsh "brrrrt". On the waterfall: a thin line that turns into a smudge.') },
    { id: 'ais', icon: '🚢', name: 'AIS', freq: '161,975 · 162,025 MHz', real: SEARCH + 'AIS',
      what: t('Un barco anunciando su nombre, posición, rumbo y velocidad. Cada mensaje dura 26,7 milisegundos, a 9.600 bits por segundo.', 'A ship announcing its name, position, course and speed. Each message lasts 26.7 milliseconds, at 9,600 bits per second.'),
      look: t('Chasquidos secos y muy cortos cada pocos segundos. En la cascada: rayitas horizontales sueltas.', 'Short, dry clicks every few seconds. On the waterfall: isolated little horizontal dashes.') },
    { id: 'sonde', icon: '🎈', name: t('Radiosonda', 'Radiosonde'), freq: '400–406 MHz', real: 'https://www.sigidwiki.com/wiki/Vaisala_RS41-SG_Weather_Balloon_(Radiosonde)',
      what: t('Una radiosonda Vaisala RS41 subiendo colgada de un globo: cada segundo envía medio segundo de datos (posición, temperatura, humedad, presión) a 4.800 bits por segundo.', 'A Vaisala RS41 radiosonde climbing under a balloon: every second it sends half a second of data (position, temperature, humidity, pressure) at 4,800 bits per second.'),
      look: t('"Brrp… brrp… brrp", una vez por segundo. En la cascada: bloques regulares como una escalera.', '"Brrp… brrp… brrp", once a second. On the waterfall: regular blocks like a ladder.') },
    { id: 'apt', icon: '🛰️', name: t('Satélite NOAA (APT)', 'NOAA satellite (APT)'), freq: t('137 MHz · histórico', '137 MHz · historic'), real: SEARCH + 'APT',
      what: t('El sonido de los satélites del tiempo NOAA, que se apagaron en 2025: una foto analógica enviada línea a línea, dos por segundo, sobre un tono de 2.400 Hz.', 'The sound of the NOAA weather satellites, switched off in 2025: an analogue photo sent line by line, two per second, on a 2,400 Hz tone.'),
      look: t('Un "tic-tac" rítmico sobre un pitido. En la cascada: una raya en 2.400 Hz con marcas regulares.', 'A rhythmic "tick-tock" over a whistle. On the waterfall: a line at 2,400 Hz with regular marks.') },
    { id: 'fm', icon: '🌫️', name: t('Canal FM vacío', 'Empty FM channel'), freq: t('Cualquier banda en FM', 'Any FM band'), real: SEARCH + 'NFM',
      what: t('Lo que suena al abrir el silenciador (squelch) en un canal sin nadie: ruido puro. Cuando alguien transmite, el ruido desaparece de golpe; al soltar, se oye una "cola".', 'What you hear when you open the squelch on an empty channel: pure noise. When someone transmits, the noise vanishes at once; when they let go, you hear a "tail".'),
      look: t('Un soplido que se corta de golpe. En la cascada: todo el ancho lleno de puntos que desaparece.', 'A hiss that stops abruptly. On the waterfall: the whole width full of speckles that disappears.') }
  ];

  /* Síntesis: cada función recibe la frecuencia de muestreo y devuelve las muestras (Float32Array, −1…1). */
  const rnd = () => Math.random() * 2 - 1;
  /** Filtro paso bajo de un polo, en el sitio: suaviza cambios bruscos (como el filtro de un receptor). */
  const lowpass = (x, sr, fc) => { const a = 1 - Math.exp(-2 * Math.PI * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; };
  /**
   * Escribe datos binarios aleatorios (sin retorno a cero: +1 o −1 por bit) a `baud` bits por segundo.
   * @param {Float32Array} x  Muestras de salida.  @param {number} sr  Frecuencia de muestreo.
   * @param {number} from  Instante de inicio (s).  @param {number} dur  Duración (s).  @param {number} baud  Bits por segundo.
   * @param {number} amp  Amplitud.  @param {function} [bit]  Función (n) → ±1 para el bit n; por defecto aleatorio.
   */
  const nrz = (x, sr, from, dur, baud, amp, bit) => {
    const a = Math.floor(from * sr), b = Math.min(x.length, Math.floor((from + dur) * sr)); let v = 1, last = -1;
    for (let i = a; i < b; i++) { const n = Math.floor((i - a) / sr * baud); if (n !== last) { v = bit ? bit(n) : (Math.random() < 0.5 ? -1 : 1); last = n; } x[i] += v * amp; }
  };
  const SYNTH = {
    tetra: sr => { const x = new Float32Array(sr * 4); for (let i = 0; i < x.length; i++) x[i] = rnd(); lowpass(x, sr, 5200);
      for (let i = 0; i < x.length; i++) { const tt = i / sr; x[i] *= 0.9 * (0.65 + 0.35 * Math.sign(Math.sin(2 * Math.PI * 17.65 * tt))); } return x; },
    dmr: sr => { const x = new Float32Array(sr * 3.4); for (let i = Math.floor(0.2 * sr); i < 3.2 * sr; i++) { const tt = i / sr - 0.2; if ((tt % 0.06) < 0.03) x[i] = rnd(); } return lowpass(x, sr, 4500); },
    pocsag: sr => { const x = new Float32Array(sr * 2.6); nrz(x, sr, 0.2, 0.6, 1200, 0.45, n => (n % 2 ? 1 : -1)); nrz(x, sr, 0.8, 1.6, 1200, 0.45); return lowpass(x, sr, 2600); },
    ais: sr => { const x = new Float32Array(sr * 4); [0.3, 1.7, 2.2, 3.4].forEach(s => nrz(x, sr, s, 0.0267, 9600, 0.6)); return lowpass(x, sr, 5000); },
    sonde: sr => { const x = new Float32Array(sr * 4.2); for (let k = 0; k < 4; k++) nrz(x, sr, 0.2 + k, 0.53, 4800, 0.45); return lowpass(x, sr, 4200); },
    apt: sr => { const x = new Float32Array(sr * 4); let img = 0;
      for (let i = 0; i < x.length; i++) { const tt = i / sr, ph = tt % 0.5; // cada 0,5 s una línea (dos imágenes de 0,25 s)
        let env;
        if (ph < 0.017) env = Math.sin(2 * Math.PI * 1040 * tt) > 0 ? 0.95 : 0.1; // sincronismo A: 7 ciclos a 1.040 Hz
        else if (ph > 0.25 && ph < 0.266) env = Math.sin(2 * Math.PI * 832 * tt) > 0 ? 0.95 : 0.1; // sincronismo B
        else { if (i % 12 === 0) img = 0.35 + 0.35 * Math.abs(Math.sin(tt * 3.1 + Math.sin(tt * 47))); env = img; }
        x[i] = 0.55 * env * Math.sin(2 * Math.PI * 2400 * tt); }
      return x; },
    fm: sr => { const x = new Float32Array(sr * 3.4); for (let i = 0; i < x.length; i++) { const tt = i / sr; if ((tt > 0.2 && tt < 1.3) || (tt > 2.0 && tt < 3.1)) x[i] = rnd(); } return lowpass(x, sr, 6500); }
  };

  let ctx = null, analyser = null, src = null, raf = null, tailUntil = 0, current = null;
  const g2 = canvas.getContext('2d');
  const MAXF = 6000;
  /** Mismo degradado que la cascada de sounds.js: azul noche → azul → ámbar → blanco cálido. */
  function color(v) {
    const x = v / 255;
    if (x < 0.35) { const k = x / 0.35; return [15 + k * 25, 27 + k * 63, 45 + k * 125]; }
    if (x < 0.7) { const k = (x - 0.35) / 0.35; return [40 + k * 202, 90 + k * 89, 170 - k * 109]; }
    const k = (x - 0.7) / 0.3; return [242 + k * 13, 179 + k * 57, 61 + k * 129];
  }
  g2.fillStyle = '#0f1b2d'; g2.fillRect(0, 0, canvas.width, canvas.height);
  /** Una fila nueva de la cascada (ver draw() en sounds.js; aquí de 0 a 6.000 Hz). */
  function draw() {
    const w = canvas.width, h = canvas.height;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    g2.putImageData(g2.getImageData(0, 0, w, h - 1), 0, 1);
    const row = g2.createImageData(w, 1), hz = ctx.sampleRate / analyser.fftSize;
    for (let x = 0; x < w; x++) {
      const [r, gg, b] = color(Math.max(0, bins[Math.min(bins.length - 1, Math.round(x / w * MAXF / hz))] - 60) * 1.35);
      row.data.set([r, gg, b, 255], x * 4);
    }
    g2.putImageData(row, 0, 0);
    raf = (src || performance.now() < tailUntil) ? requestAnimationFrame(draw) : null;
  }
  /** Para la señal que suena y deja caer la cascada 1,5 s más. */
  function stop() {
    if (src) { try { src.stop(); } catch (e) { /* ya parada */ } src = null; }
    tailUntil = performance.now() + 1500;
    grid.querySelectorAll('[aria-pressed="true"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    $('sigNow').textContent = t('Elige una señal', 'Choose a signal');
    current = null;
  }
  /**
   * Genera y reproduce una señal, pinta su ficha y arranca la cascada. Pulsar la que ya suena la para.
   * @param {string} id  Clave de SIGNALS y SYNTH.
   */
  function play(id) {
    if (current === id) { stop(); return; }
    stop();
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.2;
      // Margen de -95 a -15 dB: el ruido de banda ancha (TETRA, DMR) no satura la cascada y los tonos destacan.
      analyser.minDecibels = -95; analyser.maxDecibels = -15;
      const gain = ctx.createGain(); gain.gain.value = 0.6; analyser.connect(gain); gain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    const s = SIGNALS.find(x => x.id === id);
    const data = SYNTH[id](ctx.sampleRate);
    const buf = ctx.createBuffer(1, data.length, ctx.sampleRate); buf.copyToChannel(data, 0);
    src = ctx.createBufferSource(); src.buffer = buf; src.connect(analyser);
    src.onended = () => { if (current === id) stop(); };
    src.start();
    current = id;
    grid.querySelector(`[data-id="${id}"]`).setAttribute('aria-pressed', 'true');
    $('sigNow').textContent = `▶ ${s.name}`;
    info.innerHTML = `<h3>${s.icon} ${s.name}</h3><p class="note">${s.freq}</p><p>${s.what}</p><p class="look">${s.look}</p><p><a href="${s.real}" target="_blank" rel="noopener">${t('Grabaciones reales y detalles técnicos (Signal Identification Wiki, en inglés) ↗', 'Real recordings and technical details (Signal Identification Wiki) ↗')}</a></p>`;
    Radio.emit('signal', id);
    if (!raf) raf = requestAnimationFrame(draw);
  }
  // Textos propios (SIGNALS), sin datos externos.
  grid.innerHTML = SIGNALS.map(s => `<button type="button" class="sound-card" data-id="${s.id}" aria-pressed="false"><span aria-hidden="true">${s.icon}</span> ${s.name}</button>`).join('');
  grid.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) play(b.dataset.id); });
  $('sigStop').addEventListener('click', stop);
})();
