/**
 * stations.js · Mapa de emisoras de radiodifusión con reproductor y línea gris.
 *
 * Página: Escuchar (#emisoras). Necesita: #map, #country, #stationSearch, #randomStation, #stationList,
 *   #stationStatus, #player, #playBtn, #nowName, #nowMeta, #volume. Depende de: Leaflet.
 *   Leaflet (global L, 1.9.4 desde cdnjs) se carga antes que este archivo; si no ha cargado, la lista y el
 *   reproductor funcionan igual y en #map sale un aviso. Usa Radio.emit y Radio.t (textos en los dos idiomas).
 *
 * Datos: API abierta de Radio Browser (https://www.radio-browser.info). Prueba varios servidores espejo
 * (de1, de2, fi1, at1) y se queda con el primero que responde. Solo pide emisoras HTTPS (is_https=true)
 * para evitar contenido mixto en GitHub Pages. Al reproducir llama a /json/url/<uuid>, que es la forma
 * educada de contar la escucha en el directorio.
 * Línea gris: zona de noche calculada con la posición del Sol (fórmulas aproximadas de NOAA),
 * actualizada cada minuto.
 * Carga perezosa: el mapa y los datos solo se piden cuando la sección se acerca a la pantalla.
 * Logro: Radio.emit('station', uuid) al reproducir.
 *
 * Peticiones a Radio Browser: una búsqueda al llegar a la sección y otra cada vez que se cambia el país o
 *   se deja de escribir en el buscador (450 ms de espera), más una de cortesía por emisora reproducida.
 *   Si responde vacío buscando por etiqueta, se repite una vez por nombre.
 * Teselas del mapa: Esri World Dark Gray (sin clave, con atribución obligatoria). Ver docs/DATOS.md.
 * El audio viene directamente del servidor de cada emisora; el service worker no lo guarda.
 * No guarda nada en localStorage.
 *
 * Cómo modificarlo:
 *  - Añadir un filtro (p. ej. por idioma): un control nuevo en el HTML, su valor en `p` dentro de load()
 *    (parámetros de /json/stations/search, como `language`) y un listener 'change' que llame a load().
 *  - Cambiar cuántas emisoras se piden o se listan: `limit` en load() (se piden 250) y `slice(0, 80)` en render().
 *  - Cambiar el aspecto de la línea gris o de los puntos: opciones de L.polygon en drawNight() y de
 *    L.circleMarker en render() (colores en hexadecimal).
 *  - Añadir un servidor espejo de Radio Browser: lista SERVERS.
 */
(() => {
  'use strict';
  if (!document.getElementById('emisoras')) return; // esta página no tiene la sección
  // Servidores espejo, en el orden en que se prueban.
  const SERVERS = ['de1', 'de2', 'fi1', 'at1'].map(s => `https://${s}.api.radio-browser.info`);
  // Último servidor que respondió bien; se prueba el primero en las siguientes peticiones.
  let server = null;

  const $ = id => document.getElementById(id);
  const { t } = Radio;
  // Un único reproductor para toda la sección: reproducir otra emisora sustituye a la anterior.
  // preload='none': no se descarga nada hasta pulsar una emisora. Volumen inicial 0,8 (de 0 a 1).
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.8;

  // map y layer (capa de puntos) de Leaflet; stations: resultados de la última búsqueda; current: la que suena.
  let map, layer, stations = [], current = null;

  /* ---------- Radio Browser ---------- */
  /**
   * Hace una petición GET a Radio Browser, probando los servidores espejo uno tras otro.
   * Empieza por el que respondió la última vez; el primero que conteste bien pasa a ser el preferido.
   * @param {string} path  Ruta con parámetros, p. ej. '/json/stations/search?…'.
   * @returns {Promise<*>} La respuesta JSON.
   * @throws {Error} 'Radio Browser no responde' si fallan todos (red, CORS o código HTTP de error).
   */
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

  /* ---------- Mapa ---------- */
  /**
   * Crea el mapa de Leaflet en #map, centrado en la península (40,2° N, 3,7° O, zoom 5), con las capas de
   * Esri (fondo y nombres), la capa de puntos y la línea gris, que se redibuja cada 60 s.
   * worldCopyJump: al arrastrar más allá de 180° el mapa salta a la copia central y los puntos siguen visibles.
   * scrollWheelZoom: false, para que la rueda del ratón desplace la página y no se quede atrapada en el mapa.
   * Si Leaflet no ha cargado, escribe un aviso en #map y no hace nada más (map queda sin definir).
   */
  function initMap() {
    if (typeof L === 'undefined') { $('map').textContent = t('No se pudo cargar el mapa.', 'The map could not be loaded.'); return; }
    map = L.map('map', { worldCopyJump: true, scrollWheelZoom: false }).setView([40.2, -3.7], 5);
    // Mapa base gris oscuro de Esri (sin API key) + capa de nombres
    // Ojo: el orden en la URL de Esri es {z}/{y}/{x} (fila antes que columna), al revés que OpenStreetMap.
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: t('Mapa', 'Map') + ' &copy; Esri, HERE, Garmin, &copy; OpenStreetMap', maxZoom: 16,
    }).addTo(map);
    L.tileLayer(esri + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
    layer = L.layerGroup().addTo(map);
    drawNight();
    setInterval(drawNight, 60000);
  }

  // ---- Línea gris: zona de noche calculada con la posición del Sol ----
  // Polígono de Leaflet con la zona de noche; se crea la primera vez y después solo se mueven sus puntos.
  let night = null;
  /**
   * Punto subsolar: el lugar de la Tierra que tiene el Sol justo encima en un instante.
   * Fórmulas aproximadas del Sol (las del Almanaque Náutico que usa NOAA), con precisión de décimas de grado,
   * de sobra para dibujar la línea gris:
   *  - n: días (con decimales) desde el 1 de enero de 2000 a las 12:00 UTC (época J2000).
   *    getTime()/86400000 son días desde 1970; 2440587,5 es el día juliano de 1970; 2451545,0 el de J2000.
   *  - Lm: longitud media del Sol (grados); g: anomalía media (radianes).
   *  - lambda: longitud eclíptica, corregida con la excentricidad de la órbita (1,915° y 0,020°).
   *  - eps: inclinación del eje de la Tierra (oblicuidad, ~23,44°).
   *  - dec: declinación del Sol = latitud del punto subsolar.
   *  - ra: ascensión recta (grados); gmst: tiempo sidéreo de Greenwich (horas · 15 = grados).
   *  - longitud subsolar = ra − gmst, llevada al rango −180…180 (+540 para no operar con negativos).
   * @param {Date} date  Instante.
   * @returns {{lat:number, lon:number}} Latitud y longitud subsolar, en grados.
   */
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
  /**
   * Dibuja (o actualiza) la zona de noche en el mapa.
   * Terminador (línea día/noche): para cada longitud, la latitud donde el Sol está en el horizonte cumple
   *   tan(lat) = −cos(lon − lonSol) / tan(decSol).
   * Se calcula cada 2° de −540° a 540° (tres vueltas al mundo) para que la sombra siga viéndose en las
   * copias del mapa al arrastrarlo (worldCopyJump). Luego se cierra el polígono por el polo que está en
   * noche (85°: el límite de la proyección del mapa, Web Mercator).
   * Cerca de los equinoccios la declinación es casi 0 y tan(dec) también: se fuerza un mínimo de 0,01°
   * para no dividir entre cero.
   * Efectos: crea o modifica el polígono `night` y lo manda al fondo para que no tape los puntos.
   */
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
    // interactive: false para que los clics atraviesen la sombra y lleguen a los puntos de emisoras.
    if (night) night.setLatLngs(pts);
    else night = L.polygon(pts, {
      stroke: true, color: '#f2b33d', weight: 1, opacity: 0.35,
      fillColor: '#000', fillOpacity: 0.38, interactive: false,
    }).addTo(map);
    night.bringToBack();
  }

  /**
   * Escapa HTML (copia local de Radio.esc). Todo lo que viene de Radio Browser lo escribe cualquiera
   * que dé de alta una emisora, así que se escapa siempre antes de meterlo en innerHTML.
   * @param {*} s  Texto.
   * @returns {string} Texto seguro para HTML.
   */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /**
   * Primeras tres etiquetas de una emisora ("pop,rock,news,…" → "pop · rock · news").
   * @param {{tags?:string}} s  Emisora de Radio Browser.
   * @returns {string} Etiquetas separadas por " · " (sin escapar), o cadena vacía.
   */
  const tagsOf = s => (s.tags || '').split(',').filter(Boolean).slice(0, 3).join(' · ');

  /* ---------- Búsqueda ---------- */
  /**
   * Busca emisoras con el país y el texto elegidos y repinta la lista y el mapa.
   * Parámetros: solo emisoras que funcionan (hidebroken) y por HTTPS, ordenadas de más a menos escuchadas
   * (order=clickcount, reverse=true), 250 como máximo.
   * Si el texto es una sola palabra de más de 2 letras sin tildes (p. ej. "jazz"), se busca como etiqueta
   * (género); si no, por nombre. Si por etiqueta no sale nada, se repite por nombre.
   * Efectos: textos de #stationStatus y #stationList, y `stations`. Se descartan las que no traen
   * `url_resolved` (la dirección final del audio), porque no se podrían reproducir.
   */
  async function load() {
    const country = $('country').value;
    const q = $('stationSearch').value.trim();
    $('stationStatus').textContent = t('Sintonizando…', 'Tuning in…');
    const p = new URLSearchParams({
      hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true', limit: '250',
    });
    // Código de país ISO de dos letras (ES, FR…) del desplegable; vacío = todo el mundo.
    if (country) p.set('countrycode', country);
    if (q) p.set(q.length > 2 && /^[a-z ]+$/i.test(q) && !q.includes(' ') ? 'tag' : 'name', q);
    try {
      let data = await api('/json/stations/search?' + p);
      // si buscando por etiqueta no sale nada, prueba por nombre
      if (!data.length && p.has('tag')) { p.delete('tag'); p.set('name', q); data = await api('/json/stations/search?' + p); }
      stations = data.filter(s => s.url_resolved);
      render();
    } catch (e) {
      $('stationStatus').textContent = t('No hay señal del directorio de emisoras. Inténtalo en un rato.', 'No signal from the station directory. Try again in a little while.');
      $('stationList').innerHTML = '';
    }
  }

  /**
   * Pinta los resultados de `stations`: la lista (las 80 primeras, para no hacer una página eterna) y
   * en el mapa todas las que traen coordenadas.
   * Al pulsar un elemento de la lista o un punto del mapa empieza a sonar esa emisora.
   * Si hay más de un punto, encuadra el mapa para verlos todos (margen de 30 px, sin acercarse más del zoom 7).
   * Efectos: #stationList, #stationStatus y la capa de puntos del mapa.
   */
  function render() {
    const list = $('stationList');
    list.innerHTML = '';
    if (layer) layer.clearLayers();
    // != null deja pasar el 0 (una latitud o longitud de 0 es válida) y descarta null y undefined.
    const withGeo = stations.filter(s => s.geo_lat != null && s.geo_long != null);
    $('stationStatus').textContent = stations.length
      ? t(`${stations.length} emisoras · ${withGeo.length} en el mapa`, `${stations.length} stations · ${withGeo.length} on the map`)
      : t('Nada en esta frecuencia. Prueba otra búsqueda.', 'Nothing on this frequency. Try another search.');

    stations.slice(0, 80).forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<button><strong>${esc(s.name.trim())}</strong><span>${esc(s.state || s.country)}${tagsOf(s) ? ' · ' + esc(tagsOf(s)) : ''}</span></button>`;
      li.querySelector('button').addEventListener('click', () => play(s));
      // El uuid permite marcar luego (clase "on") la emisora que está sonando.
      li.dataset.uuid = s.stationuuid;
      list.appendChild(li);
    });

    if (!map) return;
    const bounds = [];
    withGeo.forEach(s => {
      // radius en píxeles de pantalla: el punto mide lo mismo con cualquier zoom.
      const m = L.circleMarker([s.geo_lat, s.geo_long], {
        radius: 6, color: '#f2b33d', weight: 1, fillColor: '#f2b33d', fillOpacity: 0.65,
      }).addTo(layer);
      m.bindTooltip(esc(s.name.trim()));
      m.on('click', () => play(s));
      bounds.push([s.geo_lat, s.geo_long]);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }

  /* ---------- Reproductor ---------- */
  /**
   * Reproduce una emisora: carga su audio, muestra el reproductor y registra el logro.
   * @param {Object} s  Emisora de Radio Browser (stationuuid, name, url_resolved, state, country, tags…).
   * Efectos: cambia audio.src, muestra #player, escribe #nowName y #nowMeta, marca su elemento de la lista,
   *   emite 'station' (journey.js) y pide /json/url/<uuid> al servidor que respondió, para que el directorio
   *   cuente la escucha. Si el navegador no deja reproducir (formato, bloqueo del servidor), lo dice en #nowMeta.
   */
  function play(s) {
    current = s;
    audio.src = s.url_resolved;
    audio.play().catch(() => {
      $('nowMeta').textContent = t('Esta emisora no deja reproducirse desde aquí. Prueba otra.', 'This station cannot be played from here. Try another one.');
    });
    $('player').hidden = false;
    $('nowName').textContent = s.name.trim();
    $('nowMeta').textContent = [s.state, s.country, tagsOf(s)].filter(Boolean).join(' · ');
    document.querySelectorAll('#stationList li').forEach(li => li.classList.toggle('on', li.dataset.uuid === s.stationuuid));
    Radio.emit('station', s.stationuuid);
    // cortesía con el directorio: cuenta la escucha
    if (server) fetch(`${server}/json/url/${s.stationuuid}`).catch(() => {});
  }

  // Estado del reproductor según el audio: clase "playing" (animación del CSS) y icono del botón ▶/⏸.
  audio.addEventListener('playing', () => { $('player').classList.add('playing'); $('playBtn').textContent = '⏸'; });
  audio.addEventListener('pause', () => { $('player').classList.remove('playing'); $('playBtn').textContent = '▶'; });
  // Error de red o de formato mientras suena (la emisora se cae o el enlace no vale).
  audio.addEventListener('error', () => {
    if (current) $('nowMeta').textContent = t('Sin señal en esta emisora. Prueba otra.', 'No signal from this station. Try another one.');
    $('player').classList.remove('playing');
  });

  /* ---------- Controles ---------- */
  $('playBtn').addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  // El control de volumen da un valor de 0 a 1 como texto; "+" lo convierte en número.
  $('volume').addEventListener('input', e => { audio.volume = +e.target.value; });
  $('country').addEventListener('change', load);
  // Buscador con espera (debounce): solo busca cuando se deja de escribir 450 ms, para no lanzar una
  // petición por cada letra.
  let wait;
  $('stationSearch').addEventListener('input', () => { clearTimeout(wait); wait = setTimeout(load, 450); });
  // "Sorpréndeme": una emisora al azar de los resultados actuales (no hace petición nueva de búsqueda).
  $('randomStation').addEventListener('click', () => {
    if (stations.length) play(stations[Math.floor(Math.random() * stations.length)]);
  });

  // Solo carga el mapa cuando el usuario llega a la sección
  // rootMargin 300px: empieza un poco antes de que la sección entre en pantalla, para que ya esté lista.
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); initMap(); load(); }
  }, { rootMargin: '300px' });
  io.observe($('emisoras'));
})();
