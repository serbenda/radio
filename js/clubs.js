/**
 * clubs.js · "Encuentra tu radioclub" y "Citas del año".
 *
 * Página: Empezar (#clubes). Necesita: #clubMap, #clubProv, #clubNear, #clubList, #clubCount, #calList.
 * Depende de: Leaflet. Datos: URE_SECTIONS (clubs-data.js).
 *
 * Radioclubes: un marcador por provincia (en su capital, posición aproximada) con el número de secciones.
 * "La más cercana" usa la ubicación del navegador solo para elegir la provincia; no se envía a ningún sitio.
 * Calendario: fechas CALCULADAS con la regla de cada evento (p. ej. "último fin de semana completo de
 * noviembre"); se muestran los 6 próximos. Son orientativas: la web pide confirmarlas con el organizador.
 */
(() => {
  'use strict';
  if (!document.getElementById('clubes')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Capital de cada provincia, para situarlas en el mapa (aproximado)
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
  const label = p => p === 'S.C.Tenerife' ? 'Santa Cruz de Tenerife' : p;
  const byProv = {};
  URE_SECTIONS.forEach(([prov, name, call, web]) => { (byProv[prov] = byProv[prov] || []).push({ name, call, web }); });
  const provs = Object.keys(byProv).sort((a, b) => label(a).localeCompare(label(b), 'es'));

  let map = null, current = null;
  function show(prov) {
    current = prov;
    $('clubProv').value = prov;
    const list = byProv[prov] || [];
    $('clubList').innerHTML = `<h3>${esc(label(prov))} · ${list.length} ${list.length === 1 ? 'sección' : 'secciones'}</h3><ul>` + list.map(s =>
      `<li><b>${esc(s.name)}</b>${s.call ? ` <span class="call">${esc(s.call)}</span>` : ''}${s.web ? ` · <a href="${esc(s.web)}" target="_blank" rel="noopener">web</a>` : ''}</li>`).join('') +
      `</ul><p class="note">Horarios y contacto de cada sección en la <a href="https://www.ure.es/secciones/" target="_blank" rel="noopener">web de la URE</a>.</p>`;
    if (map && PROV[prov]) map.setView(PROV[prov], 7);
  }

  function initMap() {
    map = L.map('clubMap', { scrollWheelZoom: false }).setView([39.8, -3.5], 5);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Mapa &copy; Esri · Secciones: URE', maxZoom: 10 }).addTo(map);
    provs.forEach(p => {
      if (!PROV[p]) return;
      const n = byProv[p].length;
      L.marker(PROV[p], { icon: L.divIcon({ className: 'club-pin', html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
        .bindTooltip(`${label(p)}: ${n} ${n === 1 ? 'sección' : 'secciones'}`).on('click', () => show(p)).addTo(map);
    });
  }

  $('clubProv').innerHTML = '<option value="">Elige tu provincia</option>' + provs.map(p => `<option value="${esc(p)}">${esc(label(p))}</option>`).join('');
  $('clubProv').addEventListener('change', e => { if (e.target.value) show(e.target.value); });
  $('clubNear').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('clubNear').textContent = 'Buscando…';
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: la, longitude: lo } = pos.coords;
      const near = provs.filter(p => PROV[p]).sort((a, b) => Math.hypot(PROV[a][0] - la, PROV[a][1] - lo) - Math.hypot(PROV[b][0] - la, PROV[b][1] - lo))[0];
      show(near); $('clubNear').textContent = '📍 La más cercana';
    }, () => { $('clubNear').textContent = '📍 No se pudo; elige tu provincia'; }, { timeout: 10000, maximumAge: 600000 });
  });
  $('clubCount').textContent = `${URE_SECTIONS.length} secciones de la URE en ${provs.length} provincias`;

  /* ---------- Calendario ---------- */
  const fullWeekends = (y, m) => { // sábados cuyo domingo cae en el mismo mes
    const out = [];
    for (let d = 1; d <= 31; d++) { const t = new Date(y, m, d); if (t.getMonth() !== m) break; if (t.getDay() === 6 && new Date(y, m, d + 1).getMonth() === m) out.push(t); }
    return out;
  };
  const RULES = [
    { name: 'CQ WPX (voz)', m: 2, pick: w => w.at(-1), what: 'Concurso mundial: las bandas se llenan de estaciones de todo el planeta.', tip: 'Escucha en un receptor web: oirás decenas de países en una tarde.' },
    { name: 'Día Mundial del Radioaficionado', m: 3, day: 18, what: 'Aniversario de la fundación de la IARU en 1925.', tip: 'Muchos radioclubes hacen jornadas de puertas abiertas.' },
    { name: 'CQ WPX (Morse)', m: 4, pick: w => w.at(-1), what: 'El mismo concurso, en telegrafía.', tip: 'Ideal para practicar el oído con el entrenador Koch y luego escuchar de verdad.' },
    { name: 'Field Day IARU (Morse)', m: 5, pick: w => w[0], what: 'Estaciones portátiles en el campo, con antenas montadas para la ocasión.', tip: 'Pregunta a tu radioclub si sale al campo: es la mejor forma de verlo de cerca.' },
    { name: 'Campeonato Mundial IARU', m: 6, pick: w => w[1], what: 'Cada país tiene una estación especial de su asociación nacional.', tip: 'Busca estaciones españolas con indicativos especiales.' },
    { name: 'Field Day IARU (voz)', m: 8, pick: w => w[0], what: 'Estaciones en el campo, esta vez en fonía.', tip: 'Buen día para visitar una estación portátil.' },
    { name: 'JOTA-JOTI, Jamboree en el aire', m: 9, pick: w => w[2], what: 'Scouts de todo el mundo hablan por radio con ayuda de radioaficionados.', tip: 'Perfecto para ir con niños: muchos grupos scout lo organizan con un radioclub.' },
    { name: 'CQ World Wide DX (voz)', m: 9, pick: w => w.at(-1), what: 'El concurso más grande del año.', tip: 'Escucha en 20 y 15 m de día: es casi imposible no oír otro continente.' },
    { name: 'CQ World Wide DX (Morse)', m: 10, pick: w => w.at(-1), what: 'El gran concurso de telegrafía.', tip: 'Abre el receptor en 7.020 kHz y escucha el muro de Morse.' },
    { name: 'YOTA Month', m: 11, all: true, what: 'Mes de los jóvenes radioaficionados: estaciones especiales con el sufijo YOTA.', tip: 'Busca indicativos acabados en YOTA en el mapa “Ahora en el aire”.' },
  ];
  function upcoming() {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ev = [];
    [now.getFullYear(), now.getFullYear() + 1].forEach(y => RULES.forEach(r => {
      let start, end;
      if (r.all) { start = new Date(y, r.m, 1); end = new Date(y, r.m + 1, 0); }
      else if (r.day) { start = end = new Date(y, r.m, r.day); }
      else { start = r.pick(fullWeekends(y, r.m)); end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1); }
      if (end >= today) ev.push({ ...r, start, end });
    }));
    return ev.sort((a, b) => a.start - b.start).slice(0, 6);
  }
  const fmtD = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  $('calList').innerHTML = upcoming().map(e => {
    const now = new Date(), on = now >= e.start && now <= new Date(e.end.getTime() + 864e5);
    const when = e.all ? `Todo ${e.start.toLocaleDateString('es-ES', { month: 'long' })}` : +e.start === +e.end ? fmtD(e.start) : `${e.start.getDate()}-${fmtD(e.end)}`;
    return `<li class="${on ? 'on' : ''}"><span class="cal-date">${when} ${e.start.getFullYear()}${on ? ' · ¡ahora!' : ''}</span><b>${e.name}</b><p>${e.what}</p><small>👉 ${e.tip}</small></li>`;
  }).join('');

  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (typeof L !== 'undefined') initMap(); if (current) show(current); } }, { rootMargin: '300px' });
  io.observe($('clubes'));
})();
