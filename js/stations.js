/**
 * stations.js · Mapa de emisoras de radiodifusión con reproductor y línea gris.
 *
 * Página: Escuchar (#emisoras). Necesita: #map, #country, #stationSearch, #randomStation, #stationList,
 *   #stationStatus, #player, #playBtn, #nowName, #nowMeta, #volume. Depende de: Leaflet.
 *
 * Datos: API abierta de Radio Browser (https://www.radio-browser.info). Prueba varios servidores espejo
 * (de1, de2, fi1, at1) y se queda con el primero que responde. Solo pide emisoras HTTPS (is_https=true)
 * para evitar contenido mixto en GitHub Pages. Al reproducir llama a /json/url/<uuid>, que es la forma
 * educada de contar la escucha en el directorio.
 * Línea gris: zona de noche calculada con la posición del Sol (fórmulas aproximadas de NOAA),
 * actualizada cada minuto.
 * Carga perezosa: el mapa y los datos solo se piden cuando la sección se acerca a la pantalla.
 * Logro: Radio.emit('station', uuid) al reproducir.
 */
(() => {
  'use strict';
  if (!document.getElementById('emisoras')) return; // esta página no tiene la sección
  const SERVERS = ['de1', 'de2', 'fi1', 'at1'].map(s => `https://${s}.api.radio-browser.info`);
  let server = null;

  const $ = id => document.getElementById(id);
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.8;

  let map, layer, stations = [], current = null;

  async function api(path) {
    const list = server ? [server, ...SERVERS.filter(s => s !== server)] : SERVERS;
    for (const base of list) {
      try {
        const res = await fetch(base + path, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        server = base;
        return await res.json();
      } catch (e) { /* prueba el siguiente servidor */ }
    }
    throw new Error('Radio Browser no responde');
  }

  function initMap() {
    if (typeof L === 'undefined') { $('map').textContent = 'No se pudo cargar el mapa.'; return; }
    map = L.map('map', { worldCopyJump: true, scrollWheelZoom: false }).setView([40.2, -3.7], 5);
    // Mapa base gris oscuro de Esri (sin API key) + capa de nombres
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Mapa &copy; Esri, HERE, Garmin, &copy; OpenStreetMap', maxZoom: 16,
    }).addTo(map);
    L.tileLayer(esri + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
    layer = L.layerGroup().addTo(map);
    drawNight();
    setInterval(drawNight, 60000);
  }

  // ---- Línea gris: zona de noche calculada con la posición del Sol ----
  let night = null;
  function subsolar(date) {
    const rad = Math.PI / 180;
    const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // días desde J2000
    const Lm = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * rad;
    const lambda = (Lm + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
    const eps = (23.439 - 0.0000004 * n) * rad;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad;
    const gmst = ((18.697374558 + 24.06570982441908 * n) % 24) * 15;
    let lon = ra - gmst;
    lon = ((lon + 540) % 360) - 180;
    return { lat: dec / rad, lon };
  }
  function drawNight() {
    if (!map) return;
    const sun = subsolar(new Date());
    const rad = Math.PI / 180;
    const tanDec = Math.tan((Math.abs(sun.lat) < 0.01 ? 0.01 : sun.lat) * rad);
    const pts = [];
    for (let lon = -540; lon <= 540; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sun.lon) * rad) / tanDec) / rad;
      pts.push([lat, lon]);
    }
    const pole = sun.lat > 0 ? -85 : 85; // la noche cubre el polo contrario al Sol
    pts.push([pole, 540], [pole, -540]);
    if (night) night.setLatLngs(pts);
    else night = L.polygon(pts, {
      stroke: true, color: '#8be0c2', weight: 1, opacity: 0.35,
      fillColor: '#000', fillOpacity: 0.38, interactive: false,
    }).addTo(map);
    night.bringToBack();
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tagsOf = s => (s.tags || '').split(',').filter(Boolean).slice(0, 3).join(' · ');

  async function load() {
    const country = $('country').value;
    const q = $('stationSearch').value.trim();
    $('stationStatus').textContent = 'Sintonizando…';
    const p = new URLSearchParams({
      hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true', limit: '250',
    });
    if (country) p.set('countrycode', country);
    if (q) p.set(q.length > 2 && /^[a-z ]+$/i.test(q) && !q.includes(' ') ? 'tag' : 'name', q);
    try {
      let data = await api('/json/stations/search?' + p);
      // si buscando por etiqueta no sale nada, prueba por nombre
      if (!data.length && p.has('tag')) { p.delete('tag'); p.set('name', q); data = await api('/json/stations/search?' + p); }
      stations = data.filter(s => s.url_resolved);
      render();
    } catch (e) {
      $('stationStatus').textContent = 'No hay señal del directorio de emisoras. Inténtalo en un rato.';
      $('stationList').innerHTML = '';
    }
  }

  function render() {
    const list = $('stationList');
    list.innerHTML = '';
    if (layer) layer.clearLayers();
    const withGeo = stations.filter(s => s.geo_lat != null && s.geo_long != null);
    $('stationStatus').textContent = stations.length
      ? `${stations.length} emisoras · ${withGeo.length} en el mapa`
      : 'Nada en esta frecuencia. Prueba otra búsqueda.';

    stations.slice(0, 80).forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<button><strong>${esc(s.name.trim())}</strong><span>${esc(s.state || s.country)}${tagsOf(s) ? ' · ' + esc(tagsOf(s)) : ''}</span></button>`;
      li.querySelector('button').addEventListener('click', () => play(s));
      li.dataset.uuid = s.stationuuid;
      list.appendChild(li);
    });

    if (!map) return;
    const bounds = [];
    withGeo.forEach(s => {
      const m = L.circleMarker([s.geo_lat, s.geo_long], {
        radius: 6, color: '#8be0c2', weight: 1, fillColor: '#8be0c2', fillOpacity: 0.65,
      }).addTo(layer);
      m.bindTooltip(esc(s.name.trim()));
      m.on('click', () => play(s));
      bounds.push([s.geo_lat, s.geo_long]);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }

  function play(s) {
    current = s;
    audio.src = s.url_resolved;
    audio.play().catch(() => {
      $('nowMeta').textContent = 'Esta emisora no deja reproducirse desde aquí. Prueba otra.';
    });
    $('player').hidden = false;
    $('nowName').textContent = s.name.trim();
    $('nowMeta').textContent = [s.state, s.country, tagsOf(s)].filter(Boolean).join(' · ');
    document.querySelectorAll('#stationList li').forEach(li => li.classList.toggle('on', li.dataset.uuid === s.stationuuid));
    Radio.emit('station', s.stationuuid);
    // cortesía con el directorio: cuenta la escucha
    if (server) fetch(`${server}/json/url/${s.stationuuid}`).catch(() => {});
  }

  audio.addEventListener('playing', () => { $('player').classList.add('playing'); $('playBtn').textContent = '⏸'; });
  audio.addEventListener('pause', () => { $('player').classList.remove('playing'); $('playBtn').textContent = '▶'; });
  audio.addEventListener('error', () => {
    if (current) $('nowMeta').textContent = 'Sin señal en esta emisora. Prueba otra.';
    $('player').classList.remove('playing');
  });

  $('playBtn').addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  $('volume').addEventListener('input', e => { audio.volume = +e.target.value; });
  $('country').addEventListener('change', load);
  let t;
  $('stationSearch').addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 450); });
  $('randomStation').addEventListener('click', () => {
    if (stations.length) play(stations[Math.floor(Math.random() * stations.length)]);
  });

  // Solo carga el mapa cuando el usuario llega a la sección
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); initMap(); load(); }
  }, { rootMargin: '300px' });
  io.observe($('emisoras'));
})();
