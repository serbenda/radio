/**
 * glossary.js · Glosario emergente: la jerga se explica donde aparece.
 *
 * Páginas: todas. Debe cargarse el ÚLTIMO, cuando el resto de módulos ya han pintado su contenido.
 * Marca con <abbr class="term"> la primera aparición de cada término en cada <section> de <main>,
 * salvo dentro de enlaces, botones, títulos h1/h2, formularios, gráficos o elementos con [data-noglossary].
 * El bocadillo sale al pasar el ratón, al enfocar con el teclado (tabindex=0) o al tocar en el móvil; Esc lo cierra.
 * Términos ambiguos se dejan fuera a propósito (p. ej. USB: banda lateral o conector).
 *
 * Elementos: ninguno con id. Recorre `main > section` y crea él mismo el bocadillo
 *   (<div class="term-tip" role="tooltip">) al final de <body>. Estilos en css/style.css (.term, .term-tip).
 * Dependencias: solo Radio.lang (core.js), para elegir la lista de términos del idioma; no guarda nada ni emite eventos.
 * Idiomas: TERMS tiene una lista en inglés (términos tal como aparecen en el texto inglés) y otra en castellano.
 * Límite: solo marca lo que ya está en la página al cargar. Lo que otro módulo pinte después
 *   (respuestas de una API, el detalle de una banda al pulsarla…) no se marca.
 * Rendimiento: recorre el texto una vez al cargar; los manejadores del bocadillo están delegados en `document`
 *   (uno por tipo de evento, no uno por término).
 * Accesibilidad: cada término es enfocable (tabindex=0) y el bocadillo se muestra también al enfocarlo,
 *   así que se puede usar solo con teclado.
 *
 * Cómo modificarlo:
 *  - Añadir un término: una fila más en TERMS (en las dos listas, la inglesa y la castellana): [término, definición] o [término, definición, 'i'].
 *    'i' = no distinguir mayúsculas (para palabras normales como "frecuencia"); sin 'i' solo casa
 *    exactamente (siglas como "CQ", para no marcar "cq" dentro de otra cosa).
 *    Un término nunca casa dentro de otra palabra ("SDR" no se marca dentro de "WebSDR"), así que el
 *    orden casi no importa; solo decide cuál se prueba antes en cada trozo de texto.
 *  - Evitar que se marque algo: añade data-noglossary al elemento en el HTML, o su etiqueta a SKIP.
 *  - Cambiar el aspecto o el tamaño del bocadillo: CSS .term-tip; el ancho máximo (300 px) está en show().
 */
(() => {
  /* ---------- Términos ---------- */
  // Forma de cada fila: [término tal como se busca, definición en texto plano, banderas opcionales ('i')].
  // La definición se pinta con innerHTML en el bocadillo: es contenido propio, no pongas "<" sueltos.
  const TERMS = Radio.lang === 'en' ? [
    ['CQ', 'General call: “does anyone want to talk to me?”.'],
    ['QSO', 'A radio contact or conversation.'],
    ['QTH', 'Your location: the town or place you are transmitting from.'],
    ['QSL', 'Confirmation of a contact. Also the postcard that is exchanged to prove it.'],
    ['QRP', 'Transmitting with very low power, 5 watts or less.'],
    ['QRM', 'Interference caused by other stations or devices.'],
    ['QRN', 'Natural noise, mainly from thunderstorms.'],
    ['QRL', '“Is this frequency in use?” You ask it before calling.'],
    ['QRT', 'To stop transmitting and close down the station.'],
    ['DX', 'A long-distance contact, or one with an unusual country.'],
    ['73', 'Best regards: the usual way radio amateurs say goodbye.'],
    ['RST', 'Signal report: readability (1-5), strength (1-9) and, in Morse, tone (1-9). “5 and 9” is the best on voice.'],
    ['callsign', 'Your official “name” on the air, for example EA4ABC. It is issued by the authorities with your licence.', 'i'],
    ['shortwave', 'Frequencies between 3 and 30 MHz. They bounce off the ionosphere and can go right round the world.', 'i'],
    ['HF', 'High frequency: 3 to 30 MHz, shortwave.'],
    ['VHF', 'Very high frequency: 30 to 300 MHz. Local range, like walkie-talkies.'],
    ['UHF', 'Ultra high frequency: 300 MHz to 3 GHz.'],
    ['MHz', 'Megahertz: a million oscillations per second. This is how frequency is measured.'],
    ['kHz', 'Kilohertz: a thousand oscillations per second.'],
    ['frequency', 'How many times per second the wave oscillates. It is the “number on the dial”.', 'i'],
    ['wavelength', 'The distance between two crests of the wave. Work it out as 300 divided by the frequency in MHz.', 'i'],
    ['ionosphere', 'A layer of the atmosphere, 60 to 500 km up, charged by the Sun. It acts as a mirror for shortwave.', 'i'],
    ['propagation', 'How the signal travels from one place to another: in a straight line, bouncing off the ionosphere, and so on.', 'i'],
    ['grey line', 'The strip between day and night. Along it, shortwave signals travel especially far.', 'i'],
    ['MUF', 'Maximum usable frequency: above it the wave does not bounce back and escapes into space.'],
    ['SFI', 'Solar flux index. The higher it is, the better the higher bands work.'],
    ['K-index', 'Measures how disturbed the Earth’s magnetic field is. High means noise and closed bands.'],
    ['SDR', 'Software-defined radio: the computer does the receiver’s job.'],
    ['WebSDR', 'A real receiver connected to the internet that anyone can control from a web browser.'],
    ['waterfall', 'A colour chart that shows signals: frequency runs from side to side and time falls downwards.', 'i'],
    ['SSB', 'Single sideband: the most widely used voice mode on shortwave.'],
    ['CW', 'Telegraphy: Morse sent with a wave that is switched on and off.'],
    ['FT8', 'A very popular digital mode: the computer makes contacts with signals so weak the ear cannot hear them.'],
    ['RTTY', 'Radioteletype: text sent with two alternating tones.'],
    ['dipole', 'The simplest aerial: two equal wires in a line, fed in the middle.', 'i'],
    ['repeater', 'A station on high ground that retransmits your signal so it travels further.', 'i'],
    ['beacon', 'An automatic transmitter that always sends the same thing, to check how far signals are getting.', 'i'],
    ['HAREC', 'The harmonised European certificate you get when you pass the amateur radio exam.'],
    ['URE', 'Unión de Radioaficionados Españoles, Spain’s national amateur radio society.'],
    ['UTC', 'Coordinated Universal Time: the time used by radio amateurs all over the world. In winter it is the same as UK time and one hour behind mainland Spain.'],
    ['POTA', 'Parks on the Air: transmitting from nature parks, as a game with points and awards.'],
    ['YOTA', 'Youngsters On The Air: amateur radio activities for people under 26.'],
    ['SWL', 'Shortwave listener: someone who listens to the radio without transmitting. No licence needed.'],
    ['CB-27', 'Citizens Band: 40 channels around 27 MHz that anyone can use without a licence with approved equipment.'],
    ['PMR446', 'Licence-free walkie-talkies on 446 MHz, with 0.5 W and a fixed aerial. No licence needed.'],
    ['Morse', 'A code of dots and dashes for sending letters. On the radio it is called CW or telegraphy.'],
  ] : [
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
    ['CB-27', 'Banda Ciudadana: 40 canales alrededor de 27 MHz que cualquiera puede usar sin licencia con un equipo homologado.'],
    ['PMR446', 'Walkies de uso libre en 446 MHz, con 0,5 W y antena fija. No necesitan licencia.'],
    ['Morse', 'Código de puntos y rayas para enviar letras. En radio se llama CW o telegrafía.'],
  ];

  /* ---------- Búsqueda y marcado en el texto ---------- */
  // Etiquetas cuyo texto nunca se marca: interactivas (un <abbr> dentro de un botón o enlace estorbaría al
  // pulsar), títulos, código, gráficos (CANVAS, SVG y su <text>), el menú y lo que ya va en negrita.
  // Se comparan en mayúsculas porque los elementos SVG devuelven tagName en minúsculas.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'LABEL', 'ABBR', 'H1', 'H2', 'CODE', 'CANVAS', 'SVG', 'TEXT', 'NAV', 'DT', 'STRONG', 'B', 'SUMMARY']);
  /**
   * Escapa los caracteres con significado especial en una expresión regular (. * + ? ^ $ { } ( ) | [ ] \),
   * para buscar el término literalmente aunque lleve alguno de ellos (p. ej. un "?" o un ".").
   * Ojo: aquí `esc` NO es el escape de HTML de Radio.esc.
   * @param {string} s  Término.
   * @returns {string} Texto listo para meter en new RegExp().
   */
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Una expresión por término. Patrón: (^|carácter que no es letra ni número)(término) seguido de algo que
  // no sea letra ni número. Así "CW" no casa dentro de "CWOPS" ni "DX" dentro de "DXCC".
  // \p{L} y \p{N} (letras y números de cualquier idioma, con tildes) exigen la bandera 'u' (Unicode).
  // El primer grupo hace de "límite de palabra" compatible con tildes; su longitud se salta al cortar.
  // Sin bandera 'g': exec() busca siempre desde el principio del texto y devuelve la primera aparición.
  const rx = TERMS.map(([term, def, flags]) => ({
    term, def,
    re: new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(term)})(?![\\p{L}\\p{N}])`, 'u' + (flags || '')),
  }));

  /**
   * Marca la jerga dentro de una sección: la primera aparición de cada término se envuelve en
   * <abbr class="term" tabindex="0" data-def="definición">.
   * @param {Element} root  La <section> que se procesa. Cada sección lleva su propia cuenta de términos
   *   usados, así que un término se explica una vez por sección.
   * Efectos: parte nodos de texto y añade elementos <abbr> al DOM. No cambia el texto visible.
   * Detalle: cuando un término se encuentra en un trozo de texto, los siguientes términos solo se buscan en
   *   lo que queda DESPUÉS de él dentro de ese trozo (lo de antes ya se ha revisado con los términos anteriores).
   */
  function wrapIn(root) {
    const used = new Set();
    // Recorre solo nodos de texto. acceptNode descarta los vacíos y los que tienen algún antepasado
    // (hasta la propia sección incluida) en SKIP o con data-noglossary.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) {
          if (SKIP.has(p.tagName.toUpperCase()) || p.hasAttribute('data-noglossary')) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    // Primero se reúnen todos los nodos y después se modifican: cambiar el DOM mientras el TreeWalker
    // avanza le haría saltarse o repetir nodos.
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let n = node;
      for (const t of rx) {
        if (used.has(t.term) || !n || !n.parentNode) continue;
        const m = t.re.exec(n.nodeValue);
        if (!m) continue;
        used.add(t.term);
        // m[1] es el carácter anterior (o vacío al principio), m[2] el término. Se corta el texto en tres:
        // n = antes del término, after = el término, rest = lo que sigue.
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
  // Un único bocadillo para toda la página, que se mueve junto al término activo.
  const tip = document.createElement('div');
  tip.className = 'term-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  // Término cuyo bocadillo está abierto (para que un segundo toque sobre él lo cierre).
  let owner = null;
  /**
   * Muestra el bocadillo con la definición de un término, centrado sobre él.
   * @param {HTMLElement} el  El <abbr class="term">.
   * Colocación (en px, posición fija respecto a la ventana; ver .term-tip en el CSS):
   *  - Ancho: 300 px como máximo, y nunca más que la ventana menos 24 px (12 px de margen a cada lado).
   *  - Horizontal: centrado sobre el término, pero sin salirse de esos márgenes de 12 px.
   *  - Vertical: 8 px por debajo del término; si no cabe hasta el borde inferior, 8 px por encima.
   * Efectos: rellena y muestra `tip`, y apunta `owner`.
   */
  function show(el) {
    owner = el;
    tip.innerHTML = `<b>${el.textContent}</b> ${el.dataset.def}`;
    // Se muestra antes de medir: un elemento oculto tiene offsetHeight 0.
    tip.hidden = false;
    const r = el.getBoundingClientRect(), tw = Math.min(300, window.innerWidth - 24);
    tip.style.width = tw + 'px';
    let x = r.left + r.width / 2 - tw / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - tw - 12));
    const below = r.bottom + 10 + tip.offsetHeight < window.innerHeight;
    tip.style.left = x + 'px';
    tip.style.top = (below ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + 'px';
  }
  /** Oculta el bocadillo y olvida qué término lo tenía abierto. */
  function hide() { tip.hidden = true; owner = null; }
  // Ratón y teclado: abrir al pasar por encima o enfocar; cerrar al salir o perder el foco.
  document.addEventListener('mouseover', e => { const t = e.target.closest('abbr.term'); if (t) show(t); });
  document.addEventListener('mouseout', e => { if (e.target.closest('abbr.term')) hide(); });
  document.addEventListener('focusin', e => { const t = e.target.closest('abbr.term'); if (t) show(t); });
  document.addEventListener('focusout', e => { if (e.target.closest('abbr.term')) hide(); });
  // Toque en el móvil: tocar un término lo abre (o lo cierra si ya estaba abierto); tocar fuera lo cierra.
  document.addEventListener('click', e => {
    const t = e.target.closest('abbr.term');
    if (t) { owner === t && !tip.hidden ? hide() : show(t); } else hide();
  });
  // Al desplazarse, el bocadillo se quedaría descolocado: se cierra. passive: no bloquea el desplazamiento.
  window.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();
