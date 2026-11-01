/**
 * propagation.js · Propagación en lenguaje llano.
 *
 * Página: Entender (#propagacion). Necesita: #propSentence, #propBands, #propExplain, #propMeta, #mufMap, #mufWrap.
 *
 * Datos: https://www.hamqth.com/api/v2/solar (CORS abierto; pide no consultar más de una vez cada 5 minutos:
 * aquí se consulta al llegar a la sección y luego cada 15). Mapa de la MUF de KC2G como imagen SVG.
 * Estimación por grupos de bandas con reglas simples y orientativas (ver estimate()):
 *  - 80/40 m: abiertas de noche, flojas de día.  30/20 m: abiertas de día; de noche solo con flujo ≥ 120.
 *  - 17/15 m y 12/10 m: solo de día, según el flujo solar (umbrales 100 y 140).
 *  - Índice K ≥ 4 baja un nivel; K ≥ 5 cierra todo.
 * Cada banda es un botón que explica qué significa su estado. Logro: Radio.emit('prop') al tocar una.
 */
(() => {
  'use strict';
  if (!document.getElementById('propagacion')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  const SOLAR = 'https://www.hamqth.com/api/v2/solar';
  const MUF = 'https://prop.kc2g.com/renders/current/mufd-normal-now.svg';

  const GROUPS = [
    { bands: '80 · 40 m', low: true, where: 'España y Europa' },
    { bands: '30 · 20 m', mid: true, where: 'Europa, América, Asia' },
    { bands: '17 · 15 m', high: 100, where: 'Otros continentes' },
    { bands: '12 · 10 m', high: 140, where: 'Todo el mundo, con poca potencia' },
  ];
  const LABEL = ['Cerrada', 'Floja', 'Abierta'];
  const CLASS = ['bad', 'fair', 'good'];

  // Reglas sencillas y orientativas a partir del flujo solar (SFI), el índice K y si es de día
  function estimate(g, sfi, k, day) {
    let v;
    if (g.low) v = day ? 1 : 2;
    else if (g.mid) v = day ? 2 : (sfi >= 120 ? 1 : 0);
    else v = !day ? 0 : sfi >= g.high ? 2 : sfi >= g.high - 25 ? 1 : 0;
    if (k >= 5) v = 0; else if (k >= 4) v = Math.max(0, v - 1);
    return v;
  }

  function sunWord(sfi) { return sfi >= 150 ? 'muy activo' : sfi >= 110 ? 'activo' : sfi >= 85 ? 'tranquilo' : 'muy tranquilo'; }
  function fieldWord(k) { return k >= 5 ? 'hay tormenta geomagnética' : k >= 4 ? 'el campo magnético está agitado' : k >= 3 ? 'el campo magnético está algo inquieto' : 'el campo magnético está en calma'; }

  async function load() {
    const h = new Date().getHours();
    const day = h >= 8 && h < 19;
    try {
      const r = await fetch(SOLAR);
      const s = await r.json();
      const sfi = Math.round(s.solarFlux), k = s.currentKIndex != null ? Math.round(s.currentKIndex) : s.kIndex;
      if (!sfi || k == null) throw new Error('sin datos');
      const states = GROUPS.map(g => estimate(g, sfi, k, day));
      const best = GROUPS[states.lastIndexOf(Math.max(...states))];
      $('propSentence').innerHTML = `Ahora es de <b>${day ? 'día' : 'noche'}</b>, el Sol está <b>${sunWord(sfi)}</b> (flujo ${sfi}) y ${fieldWord(k)} (K = ${k}). ` +
        (Math.max(...states) === 2 ? `Lo mejor ahora: <b>${best.bands}</b>, para llegar a ${best.where.toLowerCase()}.` : 'Las bandas están flojas: buen momento para escuchar con paciencia.');
      $('propBands').innerHTML = GROUPS.map((g, i) =>
        `<button type="button" class="pb ${CLASS[states[i]]}" data-i="${i}" data-s="${states[i]}" aria-expanded="false"><span class="dot" aria-hidden="true"></span><b>${g.bands}</b><span>${LABEL[states[i]]}</span><small>${g.where}</small></button>`).join('');
      $('propExplain').textContent = 'Toca una banda para ver qué significa para ti.';
      $('propMeta').textContent = `Datos solares: HamQTH.com · actualizado ${new Date(s.fetchedAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Estimación orientativa.`;
    } catch (e) {
      $('propSentence').textContent = 'No se han podido cargar los datos solares ahora mismo. Vuelve a intentarlo en un rato.';
    }
  }

  // Qué significa cada estado, en lenguaje llano
  const MEANING = [
    'Ahora casi no se oye nada en estas bandas. No es tu radio: es el Sol o la hora. Prueba en otras o vuelve más tarde.',
    'Se oye algo, con altibajos. Ten paciencia: las señales van y vienen (es el “fading”).',
    'Buen momento: en un receptor web oirás estaciones lejanas con claridad. ¡Aprovecha!',
  ];
  $('propBands').addEventListener('click', e => {
    const b = e.target.closest('.pb'); if (!b) return;
    $('propBands').querySelectorAll('.pb').forEach(x => x.setAttribute('aria-expanded', String(x === b)));
    const g = GROUPS[+b.dataset.i];
    $('propExplain').innerHTML = `<b>${g.bands}:</b> ${MEANING[+b.dataset.s]}`;
    Radio.emit('prop', 'banda');
  });

  $('mufMap').src = MUF;
  $('mufMap').addEventListener('error', () => { $('mufWrap').hidden = true; });

  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); setInterval(load, 15 * 60000); } }, { rootMargin: '300px' });
  io.observe($('propagacion'));
})();
