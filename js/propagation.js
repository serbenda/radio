// Propagación en lenguaje llano: datos solares en directo (HamQTH) convertidos en un semáforo de bandas.
(() => {
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
        `<div class="pb ${CLASS[states[i]]}"><span class="dot"></span><b>${g.bands}</b><span>${LABEL[states[i]]}</span><small>${g.where}</small></div>`).join('');
      $('propMeta').textContent = `Datos solares: HamQTH.com · actualizado ${new Date(s.fetchedAt || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Estimación orientativa.`;
    } catch (e) {
      $('propSentence').textContent = 'No se han podido cargar los datos solares ahora mismo. Vuelve a intentarlo en un rato.';
    }
  }

  $('mufMap').src = MUF;
  $('mufMap').addEventListener('error', () => { $('mufWrap').hidden = true; });

  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); setInterval(load, 15 * 60000); } }, { rootMargin: '300px' });
  io.observe($('propagacion'));
})();
