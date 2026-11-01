/**
 * iss.js · Posición de la Estación Espacial Internacional (ISS) en directo y sus próximos pases sobre ti.
 *
 * Página: Entender (/entender/, sección #iss; si no existe, el módulo no hace nada).
 * Elementos que necesita (entender/index.html):
 *  - #issMap     Contenedor del mapa Leaflet.
 *  - #issNow     Frase "Ahora sobrevuela…" (y los mensajes de error).
 *  - #issCount   Cuenta atrás hasta el próximo pase.
 *  - #issPasses  <ol> con los próximos pases.
 *  - #issWhere   Nombre del lugar elegido.
 *  - #issCity    <select> de ciudades; el value de cada <option> es "latitud,longitud" en grados decimales.
 *  - #issGeo     Botón "Usar mi ubicación".
 *
 * Depende de: core.js (Radio.emit) y dos librerías de cdnjs cargadas en la página antes que este archivo:
 *  - satellite.js 5.0.0 (global `satellite`): implementa SGP4, el modelo estándar para propagar órbitas a
 *    partir de un TLE (dos líneas de elementos orbitales publicadas por NORAD).
 *  - Leaflet 1.9.4 (global `L`): el mapa. Teselas "World Dark Gray" de Esri (sin clave, atribución obligatoria).
 *
 * Servicios externos (docs/DATOS.md): TLE de CelesTrak, gp.php?CATNR=25544&FORMAT=TLE (25544 = número NORAD de
 *   la ISS). Una sola descarga por visita; todo lo demás se calcula en el navegador.
 *
 * Cálculos (todo local):
 *  - look(): posición sobre la Tierra (latitud, longitud, altura) y ángulos de observación desde "home":
 *    elevación (grados sobre el horizonte; > 0 = visible por radio) y acimut (dirección, 0 = norte).
 *  - findPasses(): recorre las próximas 48 h en pasos de 20 s (8.640 cálculos, unos milisegundos). Un pase
 *    empieza cuando la elevación pasa de 0° y termina al volver a 0°. Solo se guardan los de elevación
 *    máxima ≥ 10° (los más bajos se pierden entre edificios y montes) y como mucho 6.
 *    Con pasos de 20 s, el inicio y el fin pueden tener hasta 20 s de error: suficiente para avisar.
 *  - Traza en el mapa: de 45 min antes a 90 min después (una vuelta completa dura unos 92 min).
 *
 * Privacidad: la ubicación del navegador solo se pide al pulsar #issGeo y nunca se envía a ningún sitio
 *   (solo se usa en look()). No guarda nada en localStorage.
 * Eventos: Radio.emit('iss', 'pases') → `radio:event` al elegir una ciudad o usar tu ubicación (no al cargar).
 * Rendimiento: no descarga nada ni crea el mapa hasta que la sección está a 300 px de verse. Después
 *   actualiza la posición cada segundo y la traza cada 5 minutos.
 *
 * Cómo modificarlo:
 *  - Cambiar la ventana o la precisión de los pases: 48 * 3600e3 (ms de ventana) y 20e3 (paso en ms) en
 *    findPasses(); el mínimo de 10° y el máximo de 6 pases están en la misma función.
 *  - Añadir una ciudad: un <option value="lat,lon"> más en #issCity (entender/index.html); no hay que tocar este archivo.
 *  - Cambiar el lugar por defecto: `home` (Madrid) y el texto de error del botón de ubicación.
 *  - Seguir otro satélite: cambiar CATNR=25544 en TLE por su número NORAD (y los textos sobre la ISS).
 */
(() => {
  'use strict';
  if (!document.getElementById('iss')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  // TLE actualizado de la ISS (3 líneas: nombre y las dos líneas de elementos).
  const TLE = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
  // Conversión entre radianes (lo que usa satellite.js) y grados (lo que usan Leaflet y las personas).
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  /**
   * Nombre del punto cardinal más cercano a un acimut, en 8 sectores de 45°.
   * @param {number} az Acimut en RADIANES, medido desde el norte en sentido horario.
   * @returns {string} "norte", "noreste", …
   */
  const DIRS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  const dir = az => DIRS[Math.round(((az * deg) % 360) / 45) % 8];

  // Estado del módulo:
  //  satrec    órbita preparada por satellite.js a partir del TLE (null hasta descargarla);
  //  map, marker, track, homeMark  objetos de Leaflet: mapa, icono de la ISS, traza de la órbita, punto "Tú";
  //  home      observador: latitud y longitud en grados y nombre que se muestra (Madrid por defecto);
  //  passes    próximos pases calculados por findPasses();  tick  intervalo de update() (cada segundo).
  let satrec = null, map, marker, track, home = { lat: 40.4168, lon: -3.7038, name: 'Madrid' }, homeMark, passes = [], tick = null;

  /* ---------- Cálculo orbital ---------- */

  /**
   * Calcula dónde está la ISS en un instante y cómo se ve desde `home`.
   * Pasos: SGP4 da la posición en el sistema inercial ECI (km); con el tiempo sidéreo de Greenwich (gmst)
   * se pasa a coordenadas geodésicas (latitud/longitud/altura) y a coordenadas fijas a la Tierra (ECF),
   * desde las que se obtienen los ángulos de observación respecto al observador.
   * El observador se sitúa a 0,65 km de altura (la de Madrid); el error por esto es despreciable.
   * @param {Date} date Instante.
   * @returns {{lat: number, lon: number, alt: number, el: number, az: number}|null}
   *   lat/lon en grados, alt en km, el (elevación) en grados, az (acimut) en RADIANES.
   *   null si SGP4 no puede calcular (TLE caducado o erróneo).
   */
  function look(date) {
    const pv = satellite.propagate(satrec, date);
    if (!pv.position) return null;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const obs = { latitude: home.lat * rad, longitude: home.lon * rad, height: 0.65 };
    const la = satellite.ecfToLookAngles(obs, satellite.eciToEcf(pv.position, gmst));
    return { lat: geo.latitude * deg, lon: geo.longitude * deg, alt: geo.height, el: la.elevation * deg, az: la.azimuth };
  }

  /**
   * Busca los próximos pases sobre `home` en las 48 h siguientes (ver la cabecera) y los deja en `passes`.
   * Cada pase: { start, end } en ms desde 1970, maxEl en grados, azStart y azEnd en radianes.
   * Un pase que siga en curso al final de la ventana se descarta. Si la ISS ya está sobre el horizonte
   * ahora, el primer pase empieza "ahora".
   * Efectos: sustituye `passes`. Coste: 8.640 llamadas a look().
   * @returns {void}
   */
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

  /* ---------- Pintar ---------- */

  /**
   * Fecha de un pase en lenguaje natural, en la hora y el idioma locales ("martes, 21:34").
   * @param {number} t Milisegundos desde 1970.
   * @returns {string}
   */
  const fmt = t => new Date(t).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  /**
   * Calidad de un pase según su elevación máxima: ≥ 60° excelente, ≥ 30° bueno, menos, bajo.
   * @param {number} el Elevación máxima en grados.
   * @returns {string}
   */
  function quality(el) { return el >= 60 ? 'casi encima de ti: pase excelente' : el >= 30 ? 'buen pase' : 'pase bajo, cerca del horizonte'; }

  /**
   * Pinta la lista de próximos pases en #issPasses; el primero lleva la clase "next" para destacarlo.
   * Duración en minutos (mínimo 1) y direcciones de aparición y desaparición. Todo son datos calculados aquí,
   * no hace falta escaparlos.
   * @returns {void}
   */
  function renderPasses() {
    if (!passes.length) { $('issPasses').innerHTML = '<li>No hay pases útiles en las próximas 48 horas.</li>'; return; }
    $('issPasses').innerHTML = passes.map((p, i) => `<li class="${i ? '' : 'next'}">
      <b>${fmt(p.start)}</b>
      <span>${Math.max(1, Math.round((p.end - p.start) / 60000))} min · altura máxima ${Math.round(p.maxEl)}° · aparece por el ${dir(p.azStart)} y se va por el ${dir(p.azEnd)}</span>
      <small>${quality(p.maxEl)}</small></li>`).join('');
  }

  /**
   * Se ejecuta cada segundo: mueve el icono de la ISS, actualiza la frase de posición y la cuenta atrás.
   * La velocidad (27.600 km/h) es un valor fijo aproximado, no calculado. Si el pase siguiente ya ha
   * empezado (s ≤ 0) recuerda la frecuencia de voz de la ISS, 145,800 MHz FM.
   * @returns {void}
   */
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

  /**
   * Dibuja la traza de la órbita (de −45 a +90 min, un punto por minuto) como línea discontinua.
   * Cuando la longitud salta más de 180° entre dos puntos, la ISS ha cruzado el antimeridiano (±180°):
   * se empieza un tramo nuevo para que Leaflet no dibuje una raya que cruce todo el mapa.
   * Efectos: sustituye la capa `track` del mapa.
   * @returns {void}
   */
  function drawTrack() {
    const pts = [];
    for (let m = -45; m <= 90; m += 1) { const l = look(new Date(Date.now() + m * 60e3)); if (l) pts.push([l.lat, l.lon]); }
    // corta la línea al cruzar el antimeridiano
    const segs = [[]];
    pts.forEach((p, i) => { if (i && Math.abs(p[1] - pts[i - 1][1]) > 180) segs.push([]); segs.at(-1).push(p); });
    if (track) track.remove();
    track = L.layerGroup(segs.map(s => L.polyline(s, { color: '#8be0c2', weight: 1.5, opacity: 0.6, dashArray: '4 5' }))).addTo(map);
  }

  /* ---------- Lugar del observador ---------- */

  /**
   * Cambia el lugar desde el que se calculan los pases, recalcula y repinta, y avisa del logro.
   * Si la órbita aún no se ha descargado, solo guarda el lugar (init() lo usará después).
   * @param {number} lat Latitud en grados.
   * @param {number} lon Longitud en grados.
   * @param {string} name Texto para #issWhere (nombre de la ciudad o "tu ubicación").
   * @returns {void}
   */
  function setHome(lat, lon, name) {
    home = { lat, lon, name };
    $('issWhere').textContent = name;
    if (!satrec) return;
    homeMark.setLatLng([lat, lon]);
    findPasses(); renderPasses(); update();
    Radio.emit('iss', 'pases');
  }

  /* ---------- Arranque ---------- */

  /**
   * Comprueba que las librerías han cargado, descarga el TLE, crea el mapa y arranca las actualizaciones.
   * El TLE se lee por líneas: [0] nombre, [1] y [2] los elementos orbitales.
   * Mapa: zoom 1 centrado en 30° N; sin zoom con la rueda (para no atrapar el desplazamiento de la página);
   * worldCopyJump hace que los marcadores sigan visibles al dar la vuelta al mundo.
   * Efectos: red (CelesTrak y teselas de Esri), crea el mapa y dos intervalos (1 s y 5 min) que no se paran.
   * @returns {Promise<void>}
   */
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

  // "Usar mi ubicación": pide permiso al navegador solo al pulsar. maximumAge 10 min (acepta una posición
  // reciente ya conocida) y timeout 10 s. Si falla o se deniega, se sigue con el lugar anterior.
  $('issGeo').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('issGeo').textContent = 'Buscando…';
    navigator.geolocation.getCurrentPosition(
      p => { setHome(p.coords.latitude, p.coords.longitude, 'tu ubicación'); $('issGeo').textContent = '📍 Ubicación actualizada'; },
      () => { $('issGeo').textContent = '📍 No se pudo; sigo con Madrid'; },
      { maximumAge: 600000, timeout: 10000 });
  });
  // Ciudad elegida en la lista: el value es "lat,lon".
  $('issCity').addEventListener('change', e => {
    const [lat, lon] = e.target.value.split(',').map(Number);
    setHome(lat, lon, e.target.selectedOptions[0].textContent);
  });

  // Arranque perezoso: init() solo cuando la sección se acerca a la vista (a 300 px).
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); init(); } }, { rootMargin: '300px' });
  io.observe($('iss'));
})();
