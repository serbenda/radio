// Mapa de emisoras con el directorio libre Radio Browser (https://www.radio-browser.info).
(() => {
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18, subdomains: 'abcd',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
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
