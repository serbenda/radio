/**
 * iss.js · Posición de la Estación Espacial en directo y sus próximos pases sobre ti.
 *
 * Página: Entender (#iss). Necesita: #issMap, #issCount, #issNow, #issPasses, #issCity, #issGeo, #issWhere.
 * Depende de: Leaflet y satellite.js (cdnjs).
 *
 * Datos: elementos orbitales (TLE) de CelesTrak: gp.php?CATNR=25544&FORMAT=TLE. El cálculo es local (SGP4).
 * Pases: se recorren las próximas 48 h en pasos de 20 s y se guardan los de elevación máxima ≥ 10° (hasta 6).
 * Privacidad: la ubicación del navegador solo se pide al pulsar el botón y nunca se envía a ningún sitio.
 * Logro: Radio.emit('iss') al elegir una ciudad o usar tu ubicación.
 */
(() => {
  'use strict';
  if (!document.getElementById('iss')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const TLE = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  const dir = az => DIRS[Math.round(((az * deg) % 360) / 45) % 8];

  let satrec = null, map, marker, track, home = { lat: 40.4168, lon: -3.7038, name: 'Madrid' }, homeMark, passes = [], tick = null;

  function look(date) {
    const pv = satellite.propagate(satrec, date);
    if (!pv.position) return null;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const obs = { latitude: home.lat * rad, longitude: home.lon * rad, height: 0.65 };
    const la = satellite.ecfToLookAngles(obs, satellite.eciToEcf(pv.position, gmst));
    return { lat: geo.latitude * deg, lon: geo.longitude * deg, alt: geo.height, el: la.elevation * deg, az: la.azimuth };
  }

  function findPasses() {
    passes = [];
    const start = Date.now(), end = start + 48 * 3600e3;
    let inPass = null;
    for (let t = start; t < end; t += 20e3) {
      const l = look(new Date(t)); if (!l) continue;
      if (l.el > 0 && !inPass) inPass = { start: t, maxEl: l.el, azStart: l.az };
      if (inPass) {
        if (l.el > inPass.maxEl) inPass.maxEl = l.el;
        if (l.el <= 0) { inPass.end = t; inPass.azEnd = l.az; if (inPass.maxEl >= 10) passes.push(inPass); inPass = null; if (passes.length >= 6) break; }
      }
    }
  }

  const fmt = t => new Date(t).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  function quality(el) { return el >= 60 ? 'casi encima de ti: pase excelente' : el >= 30 ? 'buen pase' : 'pase bajo, cerca del horizonte'; }

  function renderPasses() {
    if (!passes.length) { $('issPasses').innerHTML = '<li>No hay pases útiles en las próximas 48 horas.</li>'; return; }
    $('issPasses').innerHTML = passes.map((p, i) => `<li class="${i ? '' : 'next'}">
      <b>${fmt(p.start)}</b>
      <span>${Math.max(1, Math.round((p.end - p.start) / 60000))} min · altura máxima ${Math.round(p.maxEl)}° · aparece por el ${dir(p.azStart)} y se va por el ${dir(p.azEnd)}</span>
      <small>${quality(p.maxEl)}</small></li>`).join('');
  }

  function update() {
    const now = new Date(), l = look(now); if (!l) return;
    marker.setLatLng([l.lat, l.lon]);
    $('issNow').innerHTML = `Ahora sobrevuela <b>${l.lat.toFixed(1)}°, ${l.lon.toFixed(1)}°</b> a <b>${Math.round(l.alt)} km</b> de altura, a unos 27.600 km/h.` +
      (l.el > 0 ? ` <b class="live">¡Está sobre tu horizonte ahora (${Math.round(l.el)}°)!</b>` : '');
    const next = passes.find(p => p.end > now.getTime());
    if (next) {
      const s = Math.round((next.start - now) / 1000);
      $('issCount').textContent = s > 0
        ? `Próximo pase en ${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min ${s % 60} s`
        : 'Pasando ahora mismo: escucha 145,800 MHz';
    }
  }

  function drawTrack() {
    const pts = [];
    for (let m = -45; m <= 90; m += 1) { const l = look(new Date(Date.now() + m * 60e3)); if (l) pts.push([l.lat, l.lon]); }
    // corta la línea al cruzar el antimeridiano
    const segs = [[]];
    pts.forEach((p, i) => { if (i && Math.abs(p[1] - pts[i - 1][1]) > 180) segs.push([]); segs.at(-1).push(p); });
    if (track) track.remove();
    track = L.layerGroup(segs.map(s => L.polyline(s, { color: '#8be0c2', weight: 1.5, opacity: 0.6, dashArray: '4 5' }))).addTo(map);
  }

  function setHome(lat, lon, name) {
    home = { lat, lon, name };
    $('issWhere').textContent = name;
    if (!satrec) return;
    homeMark.setLatLng([lat, lon]);
    findPasses(); renderPasses(); update();
    Radio.emit('iss', 'pases');
  }

  async function init() {
    if (typeof satellite === 'undefined' || typeof L === 'undefined') { $('issNow').textContent = 'No se ha podido cargar el calculador de órbitas.'; return; }
    try {
      const txt = await (await fetch(TLE)).text();
      const lines = txt.trim().split(/\r?\n/).map(s => s.trim());
      satrec = satellite.twoline2satrec(lines[1], lines[2]);
    } catch (e) { $('issNow').textContent = 'No se han podido descargar los datos de la órbita. Inténtalo en un rato.'; return; }
    map = L.map('issMap', { worldCopyJump: true, scrollWheelZoom: false, attributionControl: true }).setView([30, 0], 1);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Mapa &copy; Esri · Órbita: CelesTrak', maxZoom: 8 }).addTo(map);
    marker = L.marker([0, 0], { icon: L.divIcon({ className: 'iss-icon', html: '🛰️', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(map);
    homeMark = L.circleMarker([home.lat, home.lon], { radius: 6, color: '#ffd27a', fillColor: '#ffd27a', fillOpacity: 1 }).bindTooltip('Tú').addTo(map);
    findPasses(); renderPasses(); drawTrack(); update();
    tick = setInterval(update, 1000);
    setInterval(drawTrack, 5 * 60e3);
  }

  $('issGeo').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('issGeo').textContent = 'Buscando…';
    navigator.geolocation.getCurrentPosition(
      p => { setHome(p.coords.latitude, p.coords.longitude, 'tu ubicación'); $('issGeo').textContent = '📍 Ubicación actualizada'; },
      () => { $('issGeo').textContent = '📍 No se pudo; sigo con Madrid'; },
      { maximumAge: 600000, timeout: 10000 });
  });
  $('issCity').addEventListener('change', e => {
    const [lat, lon] = e.target.value.split(',').map(Number);
    setHome(lat, lon, e.target.selectedOptions[0].textContent);
  });

  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); init(); } }, { rootMargin: '300px' });
  io.observe($('iss'));
})();
