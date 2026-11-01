/**
 * glossary.js · Glosario emergente: la jerga se explica donde aparece.
 *
 * Páginas: todas. Debe cargarse el ÚLTIMO, cuando el resto de módulos ya han pintado su contenido.
 * Marca con <abbr class="term"> la primera aparición de cada término en cada <section> de <main>,
 * salvo dentro de enlaces, botones, títulos h1/h2, formularios, gráficos o elementos con [data-noglossary].
 * El bocadillo sale al pasar el ratón, al enfocar con el teclado (tabindex=0) o al tocar en el móvil; Esc lo cierra.
 * Términos ambiguos se dejan fuera a propósito (p. ej. USB: banda lateral o conector).
 */
(() => {
  const TERMS = [
    ['CQ', 'Llamada general: “¿alguien quiere hablar conmigo?”.'],
    ['QSO', 'Un contacto o conversación por radio.'],
    ['QTH', 'Tu localización: la ciudad o el lugar desde donde transmites.'],
    ['QSL', 'Confirmación de un contacto. También la tarjeta postal que se intercambia para demostrarlo.'],
    ['QRP', 'Transmitir con muy poca potencia, 5 vatios o menos.'],
    ['QRM', 'Interferencias causadas por otras estaciones o aparatos.'],
    ['QRN', 'Ruido natural, sobre todo el de las tormentas.'],
    ['QRL', '“¿Está ocupada la frecuencia?” Se pregunta antes de llamar.'],
    ['QRT', 'Dejar de transmitir, cerrar la estación.'],
    ['DX', 'Contacto a larga distancia o con un país poco habitual.'],
    ['73', 'Saludos cordiales: la despedida habitual entre radioaficionados.'],
    ['RST', 'Control de señal: legibilidad (1-5), intensidad (1-9) y, en Morse, tono (1-9). “5 y 9” es lo máximo en voz.'],
    ['indicativo', 'Tu “nombre” oficial en el aire, por ejemplo EA4ABC. Lo asigna la Administración con la licencia.', 'i'],
    ['onda corta', 'Frecuencias entre 3 y 30 MHz. Rebotan en la ionosfera y pueden dar la vuelta al mundo.', 'i'],
    ['HF', 'Alta frecuencia: de 3 a 30 MHz, la onda corta.'],
    ['VHF', 'Muy alta frecuencia: de 30 a 300 MHz. Alcance local, como los walkies.'],
    ['UHF', 'Ultra alta frecuencia: de 300 MHz a 3 GHz.'],
    ['MHz', 'Megahercio: un millón de oscilaciones por segundo. Así se mide la frecuencia.'],
    ['kHz', 'Kilohercio: mil oscilaciones por segundo.'],
    ['frecuencia', 'Cuántas veces por segundo oscila la onda. Es el “número del dial”.', 'i'],
    ['longitud de onda', 'Distancia entre dos crestas de la onda. Se calcula como 300 dividido entre la frecuencia en MHz.', 'i'],
    ['ionosfera', 'Capa de la atmósfera, entre 60 y 500 km de altura, cargada por el Sol. Hace de espejo para la onda corta.', 'i'],
    ['propagación', 'Cómo viaja la señal de un punto a otro: en línea recta, rebotando en la ionosfera, etc.', 'i'],
    ['línea gris', 'La franja entre el día y la noche. En ella la onda corta llega especialmente lejos.', 'i'],
    ['MUF', 'Máxima frecuencia utilizable: por encima de ella la onda no rebota y se escapa al espacio.'],
    ['SFI', 'Índice de flujo solar. Cuanto más alto, mejor funcionan las bandas altas.'],
    ['K-index', 'Índice K: mide la agitación del campo magnético de la Tierra. Alto significa ruido y bandas cerradas.'],
    ['SDR', 'Radio definida por software: el ordenador hace el trabajo del receptor.'],
    ['WebSDR', 'Receptor real conectado a internet que cualquiera puede manejar desde el navegador.'],
    ['cascada', 'Gráfico de colores que muestra las señales: la frecuencia va de lado a lado y el tiempo cae hacia abajo.', 'i'],
    ['SSB', 'Banda lateral única (BLU): el modo de voz más usado en onda corta.'],
    ['BLU', 'Banda lateral única (SSB): el modo de voz más usado en onda corta.'],
    ['CW', 'Telegrafía: Morse con una onda que se enciende y apaga.'],
    ['FT8', 'Modo digital muy popular: el ordenador hace contactos con señales tan débiles que el oído no las oye.'],
    ['RTTY', 'Radioteletipo: texto enviado con dos tonos que se alternan.'],
    ['dipolo', 'La antena más sencilla: dos cables iguales en línea, alimentados por el centro.', 'i'],
    ['repetidor', 'Estación en un sitio alto que retransmite tu señal para que llegue más lejos.', 'i'],
    ['baliza', 'Transmisor automático que emite siempre lo mismo para comprobar hasta dónde llega la señal.', 'i'],
    ['HAREC', 'Certificado armonizado europeo que se obtiene al aprobar el examen de radioaficionado.'],
    ['URE', 'Unión de Radioaficionados Españoles, la asociación nacional.'],
    ['UTC', 'Tiempo universal coordinado: la hora que usan todos los radioaficionados del mundo. En invierno, una hora menos que en la España peninsular.'],
    ['POTA', 'Parks on the Air: transmitir desde parques naturales, como un juego con puntos y diplomas.'],
    ['YOTA', 'Youngsters On The Air: actividades de radioafición para menores de 26 años.'],
    ['SWL', 'Radioescucha: quien escucha la radio sin transmitir. No necesita licencia.'],
    ['Morse', 'Código de puntos y rayas para enviar letras. En radio se llama CW o telegrafía.'],
  ];

  const SKIP = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'LABEL', 'ABBR', 'H1', 'H2', 'CODE', 'CANVAS', 'SVG', 'TEXT', 'NAV', 'DT', 'STRONG', 'B', 'SUMMARY']);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = TERMS.map(([term, def, flags]) => ({
    term, def,
    re: new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(term)})(?![\\p{L}\\p{N}])`, 'u' + (flags || '')),
  }));

  function wrapIn(root) {
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) {
          if (SKIP.has(p.tagName.toUpperCase()) || p.hasAttribute('data-noglossary')) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let n = node;
      for (const t of rx) {
        if (used.has(t.term) || !n || !n.parentNode) continue;
        const m = t.re.exec(n.nodeValue);
        if (!m) continue;
        used.add(t.term);
        const start = m.index + m[1].length;
        const after = n.splitText(start);
        const rest = after.splitText(m[2].length);
        const ab = document.createElement('abbr');
        ab.className = 'term'; ab.tabIndex = 0; ab.dataset.def = t.def; ab.textContent = after.nodeValue;
        after.replaceWith(ab);
        n = rest; // sigue buscando en el resto del texto
      }
    }
  }

  // Un término por sección: se explica la primera vez que aparece en cada bloque
  document.querySelectorAll('main > section').forEach(wrapIn);

  /* ---------- Bocadillo ---------- */
  const tip = document.createElement('div');
  tip.className = 'term-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  let owner = null;
  function show(el) {
    owner = el;
    tip.innerHTML = `<b>${el.textContent}</b> ${el.dataset.def}`;
    tip.hidden = false;
    const r = el.getBoundingClientRect(), tw = Math.min(300, window.innerWidth - 24);
    tip.style.width = tw + 'px';
    let x = r.left + r.width / 2 - tw / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - tw - 12));
    const below = r.bottom + 10 + tip.offsetHeight < window.innerHeight;
    tip.style.left = x + 'px';
    tip.style.top = (below ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + 'px';
  }
  function hide() { tip.hidden = true; owner = null; }
  document.addEventListener('mouseover', e => { const t = e.target.closest('abbr.term'); if (t) show(t); });
  document.addEventListener('mouseout', e => { if (e.target.closest('abbr.term')) hide(); });
  document.addEventListener('focusin', e => { const t = e.target.closest('abbr.term'); if (t) show(t); });
  document.addEventListener('focusout', e => { if (e.target.closest('abbr.term')) hide(); });
  document.addEventListener('click', e => {
    const t = e.target.closest('abbr.term');
    if (t) { owner === t && !tip.hidden ? hide() : show(t); } else hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();
