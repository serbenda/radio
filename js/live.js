/**
 * live.js · "Ahora en el aire": avisos (spots) del DX cluster en directo.
 *
 * Página: Escuchar (#ahora). Necesita: #liveMap, #liveStories, #liveBands, #liveSummary, #liveStatus. Depende de: Leaflet.
 *   Leaflet (global L, desde cdnjs) se carga antes que este archivo. Si Leaflet no ha cargado, no hay mapa,
 *   pero las frases, los filtros y el resumen se pintan igual. Usa Radio.emit y Radio.whileVisible.
 *
 * Datos: https://www.hamqth.com/api/v2/spots?limit=100&include=locations (CORS abierto, sin clave).
 * HamQTH pide no consultar más de una vez cada 15 s y citar la fuente: aquí se consulta cada 60 s y SOLO
 * mientras la sección está en pantalla y la pestaña visible (Radio.whileVisible); la atribución sale
 * en el mapa y bajo él. Al salir de la sección o al ocultar la pestaña se para el temporizador. Al volver se
 * consulta al momento, pero load() nunca repite antes de 15 s, así que entrar y salir deprisa no supera el límite.
 * Cada aviso se cuenta como una frase en español (país traducido, modo en palabras, distancia por haversine)
 * y lleva un enlace para escucharlo en el WebSDR de Twente si es de onda corta.
 * Logro: Radio.emit('live') al filtrar por banda o abrir un aviso.
 *
 * Qué devuelve HamQTH (campos usados):
 *  - spots[]: { spotter (quien oye), dxcall (a quien oye), freq (en kHz), band ('20M'…), mode ('CW', 'SSB'…),
 *              comment, time (fecha ISO), country (país de dxcall, en inglés), continent }
 *  - locations[]: { call, lat, lon } posición aproximada de cada indicativo (por su cuadrícula o su país).
 * No guarda nada en localStorage; los avisos nunca se guardan en la caché del service worker (son en directo).
 *
 * Cómo modificarlo:
 *  - Traducir un país más: añade "nombre en inglés tal como lo da HamQTH": 'nombre en español' a ES.
 *  - Añadir una banda o cambiar su color: BANDCOL (clave como la da HamQTH, p. ej. '60M'). Solo salen botones
 *    de filtro para las bandas que están en BANDCOL, en su mismo orden.
 *  - Cambiar cuántos avisos se cuentan como frase: `list.slice(0, 7)` en render().
 *  - Cambiar el ritmo de consulta: el 60000 (ms) del final. Nunca menos de 15000 (el mínimo de load()).
 */
(() => {
  'use strict';
  if (!document.getElementById('ahora')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  // limit=100: últimos 100 avisos; include=locations: añade las coordenadas de cada indicativo.
  const API = 'https://www.hamqth.com/api/v2/spots?limit=100&include=locations';
  // Copia de WEBSDR de data.js (este módulo no depende de data.js). Si cambia, cámbiala en los dos sitios.
  const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';
  /**
   * Escapa HTML (copia local de Radio.esc). Indicativos y comentarios los escribe cualquier persona
   * en el DX cluster, así que se escapan siempre.
   * @param {*} s  Texto.
   * @returns {string} Texto seguro para HTML.
   */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Traducciones y colores ---------- */
  // Nombres de país (entidades DXCC, en inglés como los da HamQTH) → español. Lo que no esté sale en inglés.
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
  /**
   * @param {string} c  País en inglés tal como lo da HamQTH.
   * @returns {string} Nombre en español si está en ES; si no, el original; si viene vacío, 'un país lejano'.
   */
  const country = c => ES[c] || c || 'un país lejano';
  /**
   * Modo de emisión en palabras para la frase. Cualquier modo que no sea CW, SSB, FM o AM (FT8, RTTY, PSK…)
   * se cuenta como "en modo digital".
   * @param {string} m  Modo tal como lo da HamQTH.
   * @returns {string}
   */
  const MODE = m => ({ CW: 'en Morse', SSB: 'en voz', FM: 'en FM', AM: 'en AM' })[m] || 'en modo digital';
  // Banda (como la da HamQTH) → color de líneas, puntos y botones. El orden de las claves es el de los botones.
  const BANDCOL = { '160M': '#b39ddb', '80M': '#9fa8da', '40M': '#8be0c2', '30M': '#80deea', '20M': '#ffd27a', '17M': '#ffab91', '15M': '#f48fb1', '12M': '#ce93d8', '10M': '#ff6b5a', '6M': '#e6ee9c' };
  /**
   * Nombre de banda legible: '20M' → '20 m'.
   * @param {string} b  Banda de HamQTH.
   * @returns {string}
   */
  const bandName = b => (b || '').replace('M', ' m');

  // Estado: mapa y capa de Leaflet, avisos ya ordenados, posiciones por indicativo, banda filtrada
  // ('all' = todas) y el temporizador de consulta (null cuando está parado).
  let map, layer, spots = [], locs = {}, filter = 'all', timer = null;

  /* ---------- Cálculos ---------- */
  /**
   * Distancia en kilómetros entre dos puntos de la Tierra por la fórmula del semiverseno (haversine),
   * que da la distancia por la superficie de una esfera de radio R = 6371 km (radio medio terrestre):
   *   h = sen²(Δlat/2) + cos(lat1)·cos(lat2)·sen²(Δlon/2);  d = 2·R·asen(√h).
   * @param {{lat:number, lon:number}} a  Primer punto, en grados.
   * @param {{lat:number, lon:number}} b  Segundo punto, en grados.
   * @returns {number} Distancia redondeada a km.
   */
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  /**
   * Cuánto hace de un aviso, en minutos (60000 ms = 1 min). Nunca negativo, por si el reloj del
   * dispositivo va algo atrasado respecto al servidor.
   * @param {string} t  Fecha del aviso (texto ISO que entiende Date.parse).
   * @returns {string} 'ahora mismo' o 'hace N min'.
   */
  function ago(t) {
    const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60000));
    return m < 1 ? 'ahora mismo' : `hace ${m} min`;
  }
  /**
   * Enlace al WebSDR de Twente sintonizado en la frecuencia y el modo del aviso.
   * Twente solo cubre hasta 30 MHz (30000 kHz): por encima no hay enlace.
   * Modo: cw y am tal cual; SSB en lsb por debajo de 10 MHz y usb por encima (la convención de los
   * radioaficionados); los modos digitales (FT8…) se oyen en usb.
   * @param {{freq:number, mode:string}} s  Aviso (freq en kHz).
   * @returns {string|null} URL del receptor, o null si la frecuencia es de VHF o superior.
   */
  function tuneOf(s) {
    const f = Math.round(s.freq);
    if (f > 30000) return null;
    const mode = s.mode === 'CW' ? 'cw' : s.mode === 'AM' ? 'am' : f < 10000 && s.mode === 'SSB' ? 'lsb' : 'usb';
    return WEBSDR + f + mode;
  }

  /* ---------- Mapa ---------- */
  /**
   * Crea el mapa mundial de Leaflet en #liveMap (centro 35° N, 0°, zoom 2) con el fondo de Esri y la capa
   * donde se dibujan los avisos. La atribución incluye "Spots: HamQTH.com", como pide HamQTH.
   * scrollWheelZoom: false para que la rueda desplace la página y no se quede atrapada en el mapa.
   */
  function initMap() {
    map = L.map('liveMap', { worldCopyJump: true, scrollWheelZoom: false }).setView([35, 0], 2);
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Mapa &copy; Esri &middot; Spots: HamQTH.com', maxZoom: 10 }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }

  /* ---------- Pintado ---------- */
  /**
   * Convierte un aviso en un elemento de lista con una frase en español.
   * Dos casos: si quien avisa es la propia estación (spotter === dxcall), "X avisa de que está transmitiendo";
   * si no, "X oye a Y", con la distancia si se conocen las dos posiciones.
   * Si el comentario menciona POTA, SOTA o WWFF (programas de parques y cumbres), se dice en la frase.
   * El comentario se corta a 40 caracteres. La variable CSS --band da el color de la banda.
   * @param {Object} s  Aviso de HamQTH (campos en la cabecera).
   * @returns {string} HTML de un <li>. Todo lo que viene del cluster va escapado.
   */
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

  /**
   * Pinta los avisos según el filtro de banda: líneas y puntos en el mapa, las 7 frases más recientes,
   * los botones de filtro y el resumen.
   * En el mapa, cada aviso es una línea de quien oye a quien es oído y un punto en este último; los avisos
   * sin las dos posiciones no se dibujan (pero sí cuentan en frases y resumen).
   * Los botones de filtro se calculan con TODOS los avisos (no solo los filtrados), para poder cambiar de banda.
   * Efectos: capa del mapa, #liveStories, #liveBands y #liveSummary.
   */
  function render() {
    const list = spots.filter(s => filter === 'all' || s.band === filter);
    // Sin Leaflet (cdnjs caído o bloqueado) no hay mapa: se pintan igualmente las frases y los filtros.
    if (layer) layer.clearLayers();
    if (layer) list.forEach(s => {
      const a = locs[s.spotter], b = locs[s.dxcall];
      if (!a || !b) return;
      const c = BANDCOL[s.band] || '#9c9ea6';
      // Las líneas no son interactivas para que no tapen el tooltip de los puntos.
      L.polyline([[a.lat, a.lon], [b.lat, b.lon]], { color: c, weight: 1.4, opacity: 0.55, interactive: false }).addTo(layer);
      L.circleMarker([b.lat, b.lon], { radius: 4, color: c, fillColor: c, fillOpacity: 0.9, weight: 1 })
        .bindTooltip(`${esc(s.dxcall)} · ${esc(country(s.country))} · ${bandName(s.band)}`).addTo(layer);
    });
    $('liveStories').innerHTML = list.slice(0, 7).map(story).join('') || '<li><p>No hay avisos en esta banda ahora mismo. Prueba otra.</p></li>';
    const conts = new Set(list.map(s => s.continent)).size;
    // Bandas presentes en los avisos que tienen color asignado, ordenadas como en BANDCOL.
    const bands = [...new Set(spots.map(s => s.band))].filter(b => BANDCOL[b]);
    const order = Object.keys(BANDCOL);
    bands.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    // El botón activo lleva la clase "on". `b` viene de una lista fija (BANDCOL), por eso no se escapa.
    $('liveBands').innerHTML = `<button type="button" class="chip${filter === 'all' ? ' on' : ''}" data-b="all" aria-pressed="${filter === 'all'}">Todas</button>` +
      bands.map(b => `<button type="button" class="chip${filter === b ? ' on' : ''}" data-b="${b}" aria-pressed="${filter === b}"><i class="sw" style="background:${BANDCOL[b]}" aria-hidden="true"></i>${bandName(b)}</button>`).join('');
    $('liveSummary').innerHTML = `En los últimos minutos se han publicado <b>${list.length}</b> avisos${filter === 'all' ? '' : ` en ${bandName(filter)}`}, con estaciones de <b>${conts}</b> continente${conts === 1 ? '' : 's'}.`;
  }

  /* ---------- Consulta a HamQTH ---------- */
  /**
   * Descarga los últimos avisos, los ordena del más reciente al más antiguo, indexa las posiciones por
   * indicativo y repinta. Se llama al entrar en la sección y luego cada 60 s mientras siga cerca de la pantalla.
   * Efectos: `spots`, `locs`, todo lo que pinta render() y #liveStatus (hora de la última actualización
   *   o mensaje de error). Si falla, no borra los avisos anteriores; el siguiente intento es al cabo de un minuto.
   */
  let last = 0;
  async function load() {
    // HamQTH pide no consultar más de una vez cada 15 s: al entrar y salir deprisa de la sección
    // (o al volver a la pestaña) se reutilizan los avisos que ya hay.
    if (Date.now() - last < 15000) return;
    last = Date.now();
    try {
      const r = await fetch(API);
      const d = await r.json();
      spots = (d.spots || []).sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
      locs = {};
      (d.locations || []).forEach(l => { locs[l.call] = l; });
      render();
      $('liveStatus').textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · se refresca cada minuto · datos de HamQTH.com`;
    } catch (e) {
      $('liveStatus').textContent = 'No se han podido cargar los avisos ahora mismo. Se volverá a intentar en un minuto.';
    }
  }

  /* ---------- Interacción ---------- */
  // Filtro por banda (delegación en el contenedor, porque los botones se repintan en cada render()).
  // Cuenta como logro 'live' (id 'filtro'), un paso de "Tu primer mes".
  $('liveBands').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.b; render(); Radio.emit('live', 'filtro');
  });
  // Abrir un aviso en el receptor también es logro 'live' (id 'escuchar'). Como el enlace contiene
  // "websdr", journey.js además lo cuenta como 'websdr'.
  $('liveStories').addEventListener('click', e => { if (e.target.closest('.ls-go')) Radio.emit('live', 'escuchar'); });

  /* ---------- Arranque y parada según la visibilidad de la sección ---------- */
  // Mientras la sección está en pantalla y la pestaña visible (Radio.whileVisible): crea el mapa la primera
  // vez, consulta y repite cada 60 s. Al dejar de verse o al ocultar la pestaña, se para el temporizador.
  // Así no se consulta HamQTH si nadie está mirando. load() además impide repetir antes de 15 s.
  Radio.whileVisible($('ahora'), () => {
    if (!map && typeof L !== 'undefined') initMap();
    load();
    timer = setInterval(load, 60000);
  }, () => { clearInterval(timer); timer = null; });
})();
