// "Ahora en el aire": avisos (spots) del DX cluster en tiempo real, en un mapa y contados como historias.
// Datos de HamQTH.com (API abierta con CORS). Se consulta como mucho una vez por minuto.
(() => {
  const $ = id => document.getElementById(id);
  const API = 'https://www.hamqth.com/api/v2/spots?limit=100&include=locations';
  const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ES = { 'United States': 'Estados Unidos', 'Spain': 'España', 'Germany': 'Alemania', 'France': 'Francia', 'Italy': 'Italia',
    'England': 'Inglaterra', 'Scotland': 'Escocia', 'Wales': 'Gales', 'Ireland': 'Irlanda', 'Northern Ireland': 'Irlanda del Norte', 'Portugal': 'Portugal',
    'Netherlands': 'Países Bajos', 'Belgium': 'Bélgica', 'Switzerland': 'Suiza', 'Austria': 'Austria', 'Poland': 'Polonia', 'Czech Republic': 'Chequia',
    'Slovak Republic': 'Eslovaquia', 'Hungary': 'Hungría', 'Romania': 'Rumanía', 'Bulgaria': 'Bulgaria', 'Greece': 'Grecia', 'Croatia': 'Croacia',
    'Slovenia': 'Eslovenia', 'Serbia': 'Serbia', 'Denmark': 'Dinamarca', 'Sweden': 'Suecia', 'Norway': 'Noruega', 'Finland': 'Finlandia',
    'European Russia': 'Rusia europea', 'Asiatic Russia': 'Rusia asiática', 'Ukraine': 'Ucrania', 'Belarus': 'Bielorrusia', 'Lithuania': 'Lituania',
    'Latvia': 'Letonia', 'Estonia': 'Estonia', 'Japan': 'Japón', 'China': 'China', 'South Korea': 'Corea del Sur', 'Republic of Korea': 'Corea del Sur',
    'Canada': 'Canadá', 'Mexico': 'México', 'Brazil': 'Brasil', 'Argentina': 'Argentina', 'Chile': 'Chile', 'Colombia': 'Colombia', 'Peru': 'Perú',
    'Uruguay': 'Uruguay', 'Venezuela': 'Venezuela', 'Cuba': 'Cuba', 'Puerto Rico': 'Puerto Rico', 'Australia': 'Australia', 'New Zealand': 'Nueva Zelanda',
    'South Africa': 'Sudáfrica', 'Morocco': 'Marruecos', 'Canary Islands': 'Canarias', 'Balearic Islands': 'Baleares', 'Ceuta & Melilla': 'Ceuta y Melilla',
    'India': 'India', 'Indonesia': 'Indonesia', 'Philippines': 'Filipinas', 'Thailand': 'Tailandia', 'Israel': 'Israel', 'Turkey': 'Turquía',
    'Asiatic Turkey': 'Turquía asiática', 'Kazakhstan': 'Kazajistán', 'Iceland': 'Islandia', 'Luxembourg': 'Luxemburgo', 'Mali': 'Malí',
    'Senegal': 'Senegal', 'Egypt': 'Egipto', 'Antarctica': 'Antártida', 'Hawaii': 'Hawái', 'Alaska': 'Alaska', 'Azores': 'Azores', 'Madeira Islands': 'Madeira' };
  const country = c => ES[c] || c || 'un país lejano';
  const MODE = m => ({ CW: 'en Morse', SSB: 'en voz', FM: 'en FM', AM: 'en AM' })[m] || 'en modo digital';
  const BANDCOL = { '160M': '#b39ddb', '80M': '#9fa8da', '40M': '#8be0c2', '30M': '#80deea', '20M': '#ffd27a', '17M': '#ffab91', '15M': '#f48fb1', '12M': '#ce93d8', '10M': '#ff6b5a', '6M': '#e6ee9c' };
  const bandName = b => (b || '').replace('M', ' m');

  let map, layer, spots = [], locs = {}, filter = 'all', timer = null;

  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  function ago(t) {
    const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60000));
    return m < 1 ? 'ahora mismo' : `hace ${m} min`;
  }
  function tuneOf(s) {
    const f = Math.round(s.freq);
    if (f > 30000) return null;
    const mode = s.mode === 'CW' ? 'cw' : s.mode === 'AM' ? 'am' : f < 10000 && s.mode === 'SSB' ? 'lsb' : 'usb';
    return WEBSDR + f + mode;
  }

  function initMap() {
    map = L.map('liveMap', { worldCopyJump: true, scrollWheelZoom: false }).setView([35, 0], 2);
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Mapa &copy; Esri &middot; Spots: HamQTH.com', maxZoom: 10 }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }

  function story(s) {
    const a = locs[s.spotter], b = locs[s.dxcall];
    const dist = a && b ? km(a, b) : null;
    const link = tuneOf(s);
    return `<li style="--band:${BANDCOL[s.band] || '#9c9ea6'}">
      <span class="ls-meta">${ago(s.time)} · <b>${bandName(s.band)}</b> · ${(s.freq / 1000).toFixed(3)} MHz</span>
      <p>${s.spotter === s.dxcall
        ? `<b>${esc(s.dxcall)}</b> (${esc(country(s.country))}) avisa de que está transmitiendo ${MODE(s.mode)}${/POTA|SOTA|WWFF/i.test(s.comment || '') ? ' desde un parque o una cumbre' : ''}.`
        : `<b>${esc(s.spotter)}</b> oye a <b>${esc(s.dxcall)}</b> (${esc(country(s.country))}) ${MODE(s.mode)}${dist ? `, a <b>${dist.toLocaleString('es-ES')} km</b>` : ''}.`}${s.comment ? ` <span class="ls-c">«${esc(s.comment.slice(0, 40))}»</span>` : ''}</p>
      ${link ? `<a href="${link}" target="_blank" rel="noopener" class="ls-go" data-ev="websdr">🎧 Escúchalo</a>` : ''}
    </li>`;
  }

  function render() {
    const list = spots.filter(s => filter === 'all' || s.band === filter);
    layer.clearLayers();
    list.forEach(s => {
      const a = locs[s.spotter], b = locs[s.dxcall];
      if (!a || !b) return;
      const c = BANDCOL[s.band] || '#9c9ea6';
      L.polyline([[a.lat, a.lon], [b.lat, b.lon]], { color: c, weight: 1.4, opacity: 0.55, interactive: false }).addTo(layer);
      L.circleMarker([b.lat, b.lon], { radius: 4, color: c, fillColor: c, fillOpacity: 0.9, weight: 1 })
        .bindTooltip(`${esc(s.dxcall)} · ${esc(country(s.country))} · ${bandName(s.band)}`).addTo(layer);
    });
    $('liveStories').innerHTML = list.slice(0, 7).map(story).join('') || '<li><p>No hay avisos en esta banda ahora mismo. Prueba otra.</p></li>';
    const conts = new Set(list.map(s => s.continent)).size;
    const bands = [...new Set(spots.map(s => s.band))].filter(b => BANDCOL[b]);
    const order = Object.keys(BANDCOL);
    bands.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    $('liveBands').innerHTML = `<button class="chip${filter === 'all' ? ' on' : ''}" data-b="all">Todas</button>` +
      bands.map(b => `<button class="chip${filter === b ? ' on' : ''}" data-b="${b}"><i class="sw" style="background:${BANDCOL[b]}"></i>${bandName(b)}</button>`).join('');
    $('liveSummary').innerHTML = `En los últimos minutos se han publicado <b>${list.length}</b> avisos${filter === 'all' ? '' : ` en ${bandName(filter)}`}, con estaciones de <b>${conts}</b> continente${conts === 1 ? '' : 's'}.`;
  }

  async function load() {
    try {
      const r = await fetch(API);
      const d = await r.json();
      spots = (d.spots || []).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
      locs = {};
      (d.locations || []).forEach(l => { locs[l.call] = l; });
      render();
      document.dispatchEvent(new CustomEvent('radio:event', { detail: { name: 'live', id: 'visto' } }));
      $('liveStatus').textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · se refresca cada minuto · datos de HamQTH.com`;
    } catch (e) {
      $('liveStatus').textContent = 'No se han podido cargar los avisos ahora mismo. Se volverá a intentar en un minuto.';
    }
  }

  $('liveBands').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { filter = b.dataset.b; render(); } });

  const io = new IntersectionObserver(es => {
    const on = es.some(e => e.isIntersecting);
    if (on && !map && typeof L !== 'undefined') initMap();
    if (on && !timer) { load(); timer = setInterval(load, 60000); }
    if (!on && timer) { clearInterval(timer); timer = null; }
  }, { rootMargin: '200px' });
  io.observe($('ahora'));
})();
