/**
 * sats.js · "Más satélites": dónde apuntar al QO-100 y próximos pases de los satélites FM fáciles.
 *
 * Página: Entender (#satelites), en castellano e inglés. Necesita: #qoAim, #fmPasses, #satWhere.
 * Depende de: satellite.js (cdnjs, cálculo SGP4) y core.js. Usa el mismo lugar que el bloque de la ISS:
 * iss.js avisa con el evento 'radio:home' ({ lat, lon, name }); hasta entonces, Madrid.
 * Datos: TLE de CelesTrak (https://celestrak.org/NORAD/elements/gp.php?CATNR=…&FORMAT=TLE), una descarga
 * por satélite y visita, al acercarse la sección. No guarda nada.
 *
 * QO-100 (Es'hail-2) es geoestacionario, a 25,9° E: siempre en el mismo sitio del cielo. Su orientación
 * se calcula con geometría (sin TLE): vector satélite − observador en coordenadas este-norte-arriba.
 * Satélites FM: SO-50 (NORAD 27607) y AO-91 (NORAD 43017, solo funciona con sol: batería agotada).
 * Frecuencias y estado comprobados el 2 nov 2026 (AMSAT, AMSAT-DL y URE): ver docs/DATOS.md.
 *
 * Cómo modificarlo: añade un satélite a FM con su número NORAD; cambia MIN_EL para listar pases más bajos.
 */
(() => {
  'use strict';
  const box = document.getElementById('satelites');
  if (!box) return;
  const { $, t, esc } = Radio;
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  /** Satélites FM: nombre y número NORAD (las frecuencias están en la tabla del HTML). */
  const FM = [
    { name: 'SO-50', norad: 27607 },
    { name: 'AO-91', norad: 43017, note: t('solo con sol', 'sunlight only') },
  ];
  const MIN_EL = 10; // grados: por debajo, con un walkie y una antena de mano no se suele oír nada
  const QO_LON = 25.9; // longitud del QO-100 (° E)
  let home = { lat: 40.4168, lon: -3.7038, name: 'Madrid' };
  const recs = {};

  /* ---------- QO-100: acimut y elevación ---------- */
  /**
   * Orientación de una antena hacia un satélite geoestacionario.
   * @param {number} lat Latitud del observador (°).
   * @param {number} lon Longitud del observador (°, este positivo).
   * @param {number} satLon Longitud del satélite (°).
   * @returns {{az: number, el: number}} Acimut desde el norte (°) y elevación (°).
   */
  function geoLook(lat, lon, satLon) {
    const Re = 6378, Rg = 42164; // radio terrestre y radio de la órbita geoestacionaria, en km
    const p = lat * rad, l = lon * rad, s = satLon * rad;
    const sat = [Rg * Math.cos(s), Rg * Math.sin(s), 0];
    const obs = [Re * Math.cos(p) * Math.cos(l), Re * Math.cos(p) * Math.sin(l), Re * Math.sin(p)];
    const d = sat.map((v, i) => v - obs[i]);
    const e = [-Math.sin(l), Math.cos(l), 0];
    const n = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
    const u = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const r = Math.hypot(...d);
    return { az: (Math.atan2(dot(d, e), dot(d, n)) * deg + 360) % 360, el: Math.asin(dot(d, u) / r) * deg };
  }
  const DIRS = t(['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'], ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']);
  const dir = az => DIRS[Math.round(az / 45) % 8];

  /** Pinta la orientación del QO-100 para el lugar actual. */
  function renderQO() {
    const { az, el } = geoLook(home.lat, home.lon, QO_LON);
    const n = v => Math.round(v).toLocaleString(Radio.locale);
    $('qoAim').innerHTML = el <= 0
      ? t('Desde aquí el QO-100 queda por debajo del horizonte.', 'From here QO-100 is below the horizon.')
      : t(`Desde <b>${esc(home.name)}</b>: apunta a <b>${n(az)}°</b> (${dir(az)}) y levanta la antena <b>${n(el)}°</b> sobre el horizonte. No se mueve nunca: se orienta una vez y listo.`,
          `From <b>${esc(home.name)}</b>: point at <b>${n(az)}°</b> (${dir(az)}) and tilt the dish <b>${n(el)}°</b> above the horizon. It never moves: aim once and you are done.`);
  }

  /* ---------- Satélites FM: pases ---------- */
  /**
   * Pases de las próximas 24 h con elevación máxima ≥ MIN_EL, buscando cada 30 s.
   * @param {Object} rec satrec de satellite.js.
   * @returns {Array<{start: Date, end: Date, max: number}>}
   */
  function passes(rec) {
    const gd = { latitude: home.lat * rad, longitude: home.lon * rad, height: 0.6 };
    const out = []; let cur = null;
    for (let s = 0; s < 86400; s += 30) {
      const d = new Date(Date.now() + s * 1000);
      const pv = satellite.propagate(rec, d);
      if (!pv.position) continue;
      const el = satellite.ecfToLookAngles(gd, satellite.eciToEcf(pv.position, satellite.gstime(d))).elevation * deg;
      if (el > 0 && !cur) cur = { start: d, max: el };
      if (cur) { cur.max = Math.max(cur.max, el); if (el <= 0) { cur.end = d; if (cur.max >= MIN_EL) out.push(cur); cur = null; } }
    }
    return out;
  }

  /** Pinta la lista de pases de los satélites FM (los 6 próximos, ordenados por hora). */
  function renderFM() {
    const list = [];
    FM.forEach(f => { if (recs[f.name]) passes(recs[f.name]).forEach(p => list.push({ ...p, f })); });
    list.sort((a, b) => a.start - b.start);
    const hm = d => d.toLocaleTimeString(Radio.locale, { hour: '2-digit', minute: '2-digit' });
    const day = d => d.toLocaleDateString(Radio.locale, { weekday: 'short' });
    $('fmPasses').innerHTML = list.length ? list.slice(0, 6).map(p =>
      `<li><b>${p.f.name}</b> · ${day(p.start)} ${hm(p.start)}–${hm(p.end)} · ${t('máx.', 'max')} ${Math.round(p.max)}°${p.f.note ? ` · <small>${p.f.note}</small>` : ''}</li>`).join('')
      : `<li>${t('No hay pases útiles en las próximas 24 horas, o no se han podido descargar las órbitas.', 'No useful passes in the next 24 hours, or the orbits could not be downloaded.')}</li>`;
    $('satWhere').textContent = home.name;
  }

  /** Descarga los TLE (uno por satélite) y pinta. */
  async function init() {
    renderQO();
    if (typeof satellite === 'undefined') { renderFM(); return; }
    await Promise.all(FM.map(async f => {
      try {
        const txt = await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${f.norad}&FORMAT=TLE`)).text();
        const l = txt.trim().split('\n');
        if (l.length >= 3) recs[f.name] = satellite.twoline2satrec(l[1].trim(), l[2].trim());
      } catch (e) { /* sin órbita: ese satélite no sale en la lista */ }
    }));
    renderFM();
  }

  // Mismo lugar que la ISS: iss.js lo avisa al elegir ciudad o "usar mi ubicación".
  document.addEventListener('radio:home', e => { home = e.detail; renderQO(); renderFM(); });
  Radio.onceVisible(box, init);
  renderQO();
})();
