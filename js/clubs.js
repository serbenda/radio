/**
 * clubs.js · "Encuentra tu radioclub" (mapa y lista de secciones de la URE) y "Citas del año" (calendario).
 *
 * Página: empezar/index.html, sección <section id="clubes"> (si no existe, el módulo no hace nada).
 * Elementos necesarios:
 *   #clubMap    contenedor del mapa Leaflet (se crea al acercarse a la sección).
 *   #clubProv   <select> de provincias (este módulo rellena las opciones).
 *   #clubNear   botón "📍 La más cercana" (usa la geolocalización del navegador).
 *   #clubList   lista de secciones de la provincia elegida.
 *   #clubCount  texto con el total de secciones y provincias.
 *   #calList    <ol> donde se pintan los próximos eventos del calendario.
 *
 * Dependencias:
 *   URE_SECTIONS (js/clubs-data.js)  filas [provincia, nombre, indicativo, web].
 *   L (Leaflet 1.9.4, cdnjs)         solo para el mapa; si no ha cargado, la lista y el select siguen funcionando.
 *   Teselas de Esri (World Dark Gray Base), con atribución obligatoria "Mapa © Esri".
 *
 * Radioclubes:
 *   - Un marcador por provincia, situado en su CAPITAL (posición aproximada, no el local de cada sección),
 *     con el número de secciones. Pulsarlo muestra la lista de esa provincia.
 *   - "La más cercana" pide la ubicación al navegador SOLO para elegir la provincia cuya capital está
 *     más cerca; no se guarda ni se envía a ningún sitio.
 *
 * Calendario: las fechas se CALCULAN cada vez con la regla de cada evento (lista RULES), no se escriben
 *   a mano, así que no caducan; se muestran los 6 próximos. Son orientativas: la web pide confirmarlas
 *   con el organizador.
 *
 * Textos visibles: en castellano e inglés con Radio.t(es, en); fechas con Radio.locale. Los nombres de
 *   provincias y secciones se quedan en castellano (nombres propios).
 *
 * No guarda nada en localStorage ni emite eventos.
 *
 * Cómo modificarlo:
 *   - Secciones: se editan en js/clubs-data.js (ver su cabecera), no aquí.
 *   - Provincia nueva o con otro nombre en los datos: añade su capital en PROV con la grafía EXACTA
 *     que usa clubs-data.js. Sin coordenadas, la provincia sale en el desplegable pero no en el mapa
 *     ni en "La más cercana".
 *   - Evento nuevo o regla cambiada: lista RULES (formato explicado encima de ella y en docs/CONTENIDO.md).
 */
(() => {
  'use strict';
  if (!document.getElementById('clubes')) return; // esta página no tiene la sección
  /* ---------- Utilidades ---------- */

  /**
   * Atajo de document.getElementById.
   * @param {string} id  Id del elemento, sin '#'.
   * @returns {HTMLElement|null}
   */
  const $ = id => document.getElementById(id);
  const { t, locale } = Radio;
  /**
   * Escapa los caracteres especiales de HTML. Los datos de las secciones vienen de la web de la URE,
   * así que todo lo que sale de URE_SECTIONS pasa por aquí antes de entrar en innerHTML.
   * @param {*} s
   * @returns {string}
   */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Radioclubes: datos de provincias ---------- */
  // Capital de cada provincia, para situarlas en el mapa (aproximado)
  // Formato: 'Provincia tal como aparece en clubs-data.js': [latitud, longitud] en grados decimales (WGS84).
  // Los nombres siguen la grafía de la URE (p. ej. 'Bizkaia', 'Guipúzcoa', 'S.C.Tenerife'): no los "corrijas"
  // aquí sin cambiarlos también en los datos, o la provincia se quedará sin marcador.
  const PROV = {
    'A Coruña': [43.362, -8.411], 'Álava': [42.846, -2.672], 'Albacete': [38.994, -1.858], 'Alicante': [38.345, -0.481], 'Almería': [36.834, -2.464],
    'Asturias': [43.361, -5.849], 'Ávila': [40.656, -4.681], 'Badajoz': [38.879, -6.970], 'Baleares': [39.570, 2.650], 'Barcelona': [41.387, 2.170],
    'Bizkaia': [43.263, -2.935], 'Burgos': [42.344, -3.697], 'Cáceres': [39.475, -6.372], 'Cádiz': [36.527, -6.288], 'Cantabria': [43.462, -3.810],
    'Castellón': [39.986, -0.051], 'Ceuta': [35.889, -5.321], 'Ciudad Real': [38.985, -3.927], 'Córdoba': [37.888, -4.779], 'Cuenca': [40.070, -2.137],
    'Girona': [41.979, 2.821], 'Granada': [37.177, -3.599], 'Guadalajara': [40.633, -3.167], 'Guipúzcoa': [43.318, -1.981], 'Huelva': [37.261, -6.945],
    'Huesca': [42.140, -0.408], 'Jaén': [37.779, -3.785], 'León': [42.599, -5.567], 'Lleida': [41.614, 0.626], 'Lugo': [43.012, -7.556],
    'Madrid': [40.417, -3.704], 'Málaga': [36.721, -4.421], 'Melilla': [35.292, -2.938], 'Murcia': [37.992, -1.131], 'Navarra': [42.812, -1.646],
    'Ourense': [42.336, -7.864], 'Palencia': [42.010, -4.528], 'Las Palmas': [28.124, -15.430], 'Pontevedra': [42.431, -8.645], 'La Rioja': [42.465, -2.450],
    'Salamanca': [40.970, -5.664], 'Segovia': [40.943, -4.109], 'Sevilla': [37.389, -5.984], 'Soria': [41.764, -2.465], 'Tarragona': [41.119, 1.245],
    'S.C.Tenerife': [28.464, -16.252], 'Teruel': [40.344, -1.106], 'Toledo': [39.863, -4.027], 'Valencia': [39.470, -0.376], 'Valladolid': [41.652, -4.724],
    'Zamora': [41.504, -5.745], 'Zaragoza': [41.649, -0.889],
  };
  /**
   * Nombre de la provincia para mostrar. La URE escribe 'S.C.Tenerife'; en pantalla se pone completo.
   * @param {string} p  Provincia tal como viene en los datos.
   * @returns {string}
   */
  const label = p => p === 'S.C.Tenerife' ? 'Santa Cruz de Tenerife' : p;
  // byProv: { provincia: [{ name, call, web }, …] }, agrupando las filas de URE_SECTIONS.
  // provs: provincias con al menos una sección, en orden alfabético español (por el nombre mostrado).
  const byProv = {};
  URE_SECTIONS.forEach(([prov, name, call, web]) => { (byProv[prov] = byProv[prov] || []).push({ name, call, web }); });
  const provs = Object.keys(byProv).sort((a, b) => label(a).localeCompare(label(b), 'es'));

  /* ---------- Radioclubes: lista y mapa ---------- */

  // map: instancia de Leaflet (null hasta que se crea). current: provincia elegida, para recolocar el mapa
  // si se eligió antes de que el mapa existiera.
  let map = null, current = null;
  /**
   * Muestra las secciones de una provincia: sincroniza el <select>, pinta la lista en #clubList
   * (nombre, indicativo si lo hay y enlace a su web si la tiene) y centra el mapa en la capital (zoom 7).
   * @param {string} prov  Provincia tal como aparece en los datos.
   * @returns {void}
   */
  function show(prov) {
    current = prov;
    $('clubProv').value = prov;
    const list = byProv[prov] || [];
    $('clubList').innerHTML = `<h3>${esc(label(prov))} · ${list.length} ${list.length === 1 ? t('sección', 'section') : t('secciones', 'sections')}</h3><ul>` + list.map(s =>
      `<li><b>${esc(s.name)}</b>${s.call ? ` <span class="call">${esc(s.call)}</span>` : ''}${s.web ? ` · <a href="${esc(s.web)}" target="_blank" rel="noopener">web</a>` : ''}</li>`).join('') +
      `</ul><p class="note">${t('Horarios y contacto de cada sección en la <a href="https://www.ure.es/secciones/" target="_blank" rel="noopener">web de la URE</a>.', 'Opening times and contact details for each section on the <a href="https://www.ure.es/secciones/" target="_blank" rel="noopener">URE website</a> (in Spanish).')}</p>`;
    if (map && PROV[prov]) map.setView(PROV[prov], 7);
  }

  /**
   * Crea el mapa de España (centro aproximado de la península, zoom 5) con un marcador numerado por provincia.
   * scrollWheelZoom desactivado: así la rueda del ratón desplaza la página en vez de quedarse atrapada en el mapa.
   * maxZoom 10: con las posiciones en la capital no tiene sentido acercarse más.
   * Los marcadores son L.divIcon (un <span> con el número, estilo .club-pin en style.css) de 28 × 28 px,
   * anclados en su centro (14, 14) para que el círculo quede justo sobre la capital.
   * @returns {void}
   */
  function initMap() {
    map = L.map('clubMap', { scrollWheelZoom: false }).setView([39.8, -3.5], 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: t('Mapa &copy; Esri · Secciones: URE', 'Map &copy; Esri · Sections: URE'), maxZoom: 10 }).addTo(map);
    provs.forEach(p => {
      if (!PROV[p]) return;
      const n = byProv[p].length;
      L.marker(PROV[p], { icon: L.divIcon({ className: 'club-pin', html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
        .bindTooltip(`${label(p)}: ${n} ${n === 1 ? t('sección', 'section') : t('secciones', 'sections')}`).on('click', () => show(p)).addTo(map);
    });
  }

  // Rellena el desplegable: una primera opción vacía y luego las provincias (value = nombre de los datos).
  $('clubProv').innerHTML = `<option value="">${t('Elige tu provincia', 'Choose your province')}</option>` + provs.map(p => `<option value="${esc(p)}">${esc(label(p))}</option>`).join('');
  $('clubProv').addEventListener('change', e => { if (e.target.value) show(e.target.value); });
  // "La más cercana": si el navegador no tiene geolocalización, el botón no hace nada.
  // Opciones: espera como mucho 10 s (timeout) y acepta una posición de hace hasta 10 min (maximumAge).
  $('clubNear').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('clubNear').textContent = t('Buscando…', 'Searching…');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: la, longitude: lo } = pos.coords;
      // Distancia "plana" en grados (hipotenusa de las diferencias de latitud y longitud). No es la distancia
      // real, porque un grado de longitud mide menos que uno de latitud, pero basta para elegir la capital
      // más próxima dentro de España. Solo se consideran provincias con coordenadas.
      const near = provs.filter(p => PROV[p]).sort((a, b) => Math.hypot(PROV[a][0] - la, PROV[a][1] - lo) - Math.hypot(PROV[b][0] - la, PROV[b][1] - lo))[0];
      show(near); $('clubNear').textContent = t('📍 La más cercana', '📍 The nearest one');
    }, () => { $('clubNear').textContent = t('📍 No se pudo; elige tu provincia', '📍 Couldn’t locate you; choose your province'); }, { timeout: 10000, maximumAge: 600000 });
  });
  $('clubCount').textContent = t(`${URE_SECTIONS.length} secciones de la URE en ${provs.length} provincias`, `${URE_SECTIONS.length} URE sections in ${provs.length} provinces`);


  /* ---------- Calendario ---------- */
  /**
   * Fines de semana COMPLETOS de un mes: sábados cuyo domingo cae en el mismo mes.
   * Ejemplo: si el mes acaba en sábado, ese último sábado no cuenta (su domingo es del mes siguiente).
   * El bucle va del día 1 al 31 y se corta cuando la fecha "se pasa" al mes siguiente (p. ej. 31 de abril).
   * @param {number} y  Año (p. ej. 2026).
   * @param {number} m  Mes de 0 (enero) a 11 (diciembre), como en Date de JavaScript.
   * @returns {Date[]} Sábados, en orden; cada mes tiene entre 3 y 5 (p. ej. febrero de 2026 solo tiene 3).
   */
  const fullWeekends = (y, m) => { // sábados cuyo domingo cae en el mismo mes
    const out = [];
    for (let d = 1; d <= 31; d++) { const dt = new Date(y, m, d); if (dt.getMonth() !== m) break; if (dt.getDay() === 6 && new Date(y, m, d + 1).getMonth() === m) out.push(dt); }
    return out;
  };
  // Eventos del año, definidos por REGLA (no por fecha) para que el calendario no caduque.
  // Campos:
  //   name  nombre del evento.        what  qué es (una frase).        tip  consejo para quien empieza.
  //   m     mes de 0 a 11 (0 = enero, 2 = marzo, 10 = noviembre…).
  //   Y UNA de estas reglas de fecha:
  //   pick  función que recibe los fines de semana completos del mes (fullWeekends) y elige uno:
  //           w => w[0] primero · w => w[1] segundo · w => w[2] tercero · w => w.at(-1) último.
  //         El evento dura sábado y domingo.
  //   day   día fijo del mes (p. ej. 18 de abril). Dura un día.
  //   all   true si dura todo el mes.
  // Los textos se insertan como HTML sin escapar: son textos fijos del repositorio.
  const RULES = [
    { name: t('CQ WPX (voz)', 'CQ WPX (SSB)'), m: 2, pick: w => w.at(-1), what: t('Concurso mundial: las bandas se llenan de estaciones de todo el planeta.', 'Worldwide contest: the bands fill up with stations from all over the planet.'), tip: t('Escucha en un receptor web: oirás decenas de países en una tarde.', 'Listen on a web receiver: you’ll hear dozens of countries in one afternoon.') },
    { name: t('Día Mundial del Radioaficionado', 'World Amateur Radio Day'), m: 3, day: 18, what: t('Aniversario de la fundación de la IARU en 1925.', 'Anniversary of the founding of the IARU in 1925.'), tip: t('Muchos radioclubes hacen jornadas de puertas abiertas.', 'Many radio clubs hold open days.') },
    { name: 'CQ WPX (Morse)', m: 4, pick: w => w.at(-1), what: t('El mismo concurso, en telegrafía.', 'The same contest, in Morse code.'), tip: t('Ideal para practicar el oído con el entrenador Koch y luego escuchar de verdad.', 'Ideal for training your ear with the Koch trainer and then listening for real.') },
    { name: t('Field Day IARU (Morse)', 'IARU Field Day (Morse)'), m: 5, pick: w => w[0], what: t('Estaciones portátiles en el campo, con antenas montadas para la ocasión.', 'Portable stations out in the countryside, with aerials put up for the occasion.'), tip: t('Pregunta a tu radioclub si sale al campo: es la mejor forma de verlo de cerca.', 'Ask your radio club whether it goes out: it’s the best way to see it up close.') },
    { name: t('Campeonato Mundial IARU', 'IARU HF World Championship'), m: 6, pick: w => w[1], what: t('Cada país tiene una estación especial de su asociación nacional.', 'Each country has a special station from its national society.'), tip: t('Busca estaciones españolas con indicativos especiales.', 'Look out for Spanish stations with special callsigns.') },
    { name: t('Field Day IARU (voz)', 'IARU Field Day (voice)'), m: 8, pick: w => w[0], what: t('Estaciones en el campo, esta vez en fonía.', 'Stations out in the countryside, this time on voice.'), tip: t('Buen día para visitar una estación portátil.', 'A good day to visit a portable station.') },
    { name: t('JOTA-JOTI, Jamboree en el aire', 'JOTA-JOTI, Jamboree on the Air'), m: 9, pick: w => w[2], what: t('Scouts de todo el mundo hablan por radio con ayuda de radioaficionados.', 'Scouts all over the world talk by radio with help from radio amateurs.'), tip: t('Perfecto para ir con niños: muchos grupos scout lo organizan con un radioclub.', 'Perfect for going with children: many scout groups organise it with a radio club.') },
    { name: t('CQ World Wide DX (voz)', 'CQ World Wide DX (SSB)'), m: 9, pick: w => w.at(-1), what: t('El concurso más grande del año.', 'The biggest contest of the year.'), tip: t('Escucha en 20 y 15 m de día: es casi imposible no oír otro continente.', 'Listen on 20 and 15 m during the day: it’s almost impossible not to hear another continent.') },
    { name: 'CQ World Wide DX (Morse)', m: 10, pick: w => w.at(-1), what: t('El gran concurso de telegrafía.', 'The big Morse code contest.'), tip: t('Abre el receptor en 7.020 kHz y escucha el muro de Morse.', 'Tune the receiver to 7020 kHz and listen to the wall of Morse.') },
    { name: 'YOTA Month', m: 11, all: true, what: t('Mes de los jóvenes radioaficionados: estaciones especiales con el sufijo YOTA.', 'Month of young radio amateurs: special stations with the YOTA suffix.'), tip: t('Busca indicativos acabados en YOTA en el mapa “Ahora en el aire”.', 'Look for callsigns ending in YOTA on the “On the air now” map.') },
  ];
  /**
   * Calcula las fechas de todos los eventos para este año y el siguiente y devuelve los 6 próximos.
   * Un evento cuenta como próximo si su último día es hoy o posterior (así sigue saliendo mientras dura).
   * Se calcula también el año siguiente para que en diciembre haya eventos que mostrar.
   * @returns {Array<Object>} Copias de las reglas con `start` y `end` (Date a las 00:00 hora local),
   *   ordenadas por fecha de inicio.
   */
  function upcoming() {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ev = [];
    [now.getFullYear(), now.getFullYear() + 1].forEach(y => RULES.forEach(r => {
      let start, end;
      // Todo el mes: del día 1 al último (el "día 0" del mes siguiente es el último día de este).
      // Día fijo: empieza y acaba ese día. Fin de semana: sábado elegido por `pick` y el domingo siguiente.
      if (r.all) { start = new Date(y, r.m, 1); end = new Date(y, r.m + 1, 0); }
      else if (r.day) { start = end = new Date(y, r.m, r.day); }
      else { start = r.pick(fullWeekends(y, r.m)); end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1); }
      if (end >= today) ev.push({ ...r, start, end });
    }));
    return ev.sort((a, b) => a.start - b.start).slice(0, 6);
  }
  /* ---------- Calendario: pintar ---------- */

  /**
   * Fecha en el idioma de la página, sin año: "18 de abril" / "18 April".
   * @param {Date} d
   * @returns {string}
   */
  const fmtD = d => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  $('calList').innerHTML = upcoming().map(e => {
    // "¡ahora!": el evento está en curso. `end` es la medianoche del último día, así que se le suma un día
    // (864e5 ms = 24 h) para incluir ese día completo.
    // Texto de la fecha: "Todo diciembre", "18 de abril" (un día) o "25-26 de octubre" (fin de semana; nunca
    // cruza de mes porque solo se usan fines de semana completos).
    const now = new Date(), on = now >= e.start && now <= new Date(e.end.getTime() + 864e5);
    const when = e.all ? t(`Todo ${e.start.toLocaleDateString(locale, { month: 'long' })}`, `All of ${e.start.toLocaleDateString(locale, { month: 'long' })}`) : +e.start === +e.end ? fmtD(e.start) : `${e.start.getDate()}-${fmtD(e.end)}`;
    return `<li class="${on ? 'on' : ''}"><span class="cal-date">${when} ${e.start.getFullYear()}${on ? t(' · ¡ahora!', ' · now on!') : ''}</span><b>${e.name}</b><p>${e.what}</p><small>👉 ${e.tip}</small></li>`;
  }).join('');

  /* ---------- Carga perezosa del mapa ---------- */

  // El mapa (y sus teselas) solo se crea cuando la sección está a menos de 300 px de verse, una sola vez.
  // Si Leaflet no ha cargado (sin conexión, bloqueado), se queda sin mapa pero con lista y desplegable.
  // Si ya se había elegido provincia, se vuelve a llamar a show() para centrar el mapa en ella.
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (typeof L !== 'undefined') initMap(); if (current) show(current); } }, { rootMargin: '300px' });
  io.observe($('clubes'));
})();
