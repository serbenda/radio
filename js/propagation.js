/**
 * propagation.js · "¿Cómo está hoy la propagación?": frase en lenguaje llano y semáforo de bandas.
 *
 * Página: Entender (/entender/, sección #propagacion; si no existe, el módulo no hace nada).
 * Elementos que necesita (entender/index.html):
 *  - #propSentence  Frase resumen ("Ahora es de día, el Sol está activo…") o el mensaje de error.
 *  - #propBands     Contenedor de los cuatro botones de grupos de bandas (el semáforo).
 *  - #propExplain   Explicación del estado de la banda tocada.
 *  - #propMeta      Línea de fuente y hora de actualización.
 *  - #mufMap        <img> del mapa de la MUF · #mufWrap  tarjeta que lo contiene (se oculta si la imagen falla).
 *
 * Depende de: core.js (Radio.emit). Sin librerías.
 *
 * Servicios externos (detalle y condiciones en docs/DATOS.md):
 *  - HamQTH solar, https://www.hamqth.com/api/v2/solar (JSON, CORS abierto, sin clave). Campos usados:
 *    solarFlux (flujo solar, SFI), currentKIndex o, si falta, kIndex (índice K), fetchedAt (hora del dato).
 *    Pide no consultar más de una vez cada 5 minutos: aquí se consulta al acercarse a la sección y luego
 *    cada 15 minutos mientras la página esté abierta. Hay que citar la fuente ("Datos solares: HamQTH.com").
 *  - KC2G, mapa de la MUF (máxima frecuencia utilizable para saltos de 3.000 km) como imagen SVG; se carga
 *    con un <img>, así que no necesita CORS. Si falla, se oculta la tarjeta.
 *
 * Estimación (estimate()): reglas simples y ORIENTATIVAS, no un modelo de propagación. Estados: 0 cerrada,
 * 1 floja, 2 abierta. "Día" = de 8:00 a 18:59 en la hora del dispositivo.
 *  - 80/40 m: abiertas de noche, flojas de día (la capa D las absorbe).
 *  - 30/20 m: abiertas de día; de noche, flojas si el flujo es ≥ 120 y cerradas si no.
 *  - 17/15 m: solo de día; abiertas con flujo ≥ 100, flojas con ≥ 75 (umbral − 25), cerradas por debajo.
 *  - 12/10 m: igual, con umbral 140 (flojas con ≥ 115).
 *  - Índice K (0-9, agitación del campo magnético): K ≥ 4 baja un nivel todas; K ≥ 5 (tormenta) cierra todo.
 *  Referencia del flujo solar (SFI, unidades de flujo solar): < 85 muy tranquilo, 85-109 tranquilo,
 *  110-149 activo, ≥ 150 muy activo (ver sunWord()).
 *
 * No guarda nada en localStorage.
 * Eventos: Radio.emit('prop', 'banda') → `radio:event` al tocar una banda (paso de "Tu primer mes";
 *   se exige tocar, no basta con cargar la página: docs/DECISIONES.md, D08).
 * Rendimiento: no pide nada hasta que la sección está a menos de 300 px de verse (IntersectionObserver).
 * Accesibilidad: cada banda es un <button> con aria-expanded (true en la que se está explicando); el punto
 *   de color es decorativo (aria-hidden) porque el estado también va escrito ("Abierta", "Floja"…).
 *
 * Cómo modificarlo:
 *  - Cambiar umbrales o reglas: estimate() (y los textos de sunWord() y fieldWord() si cambias los cortes).
 *  - Añadir o quitar un grupo de bandas: GROUPS (campos explicados encima); estimate() debe saber tratarlo.
 *  - Cambiar los textos de cada estado: LABEL (etiqueta corta) y MEANING (explicación al tocar).
 *  - Cambiar la frecuencia de actualización: el 15 * 60000 del final (no bajar de 5 min por las condiciones
 *    de HamQTH).
 */
(() => {
  'use strict';
  if (!document.getElementById('propagacion')) return; // esta página no tiene la sección
  const $ = id => document.getElementById(id);
  // Fuentes de datos (ver la cabecera y docs/DATOS.md).
  const SOLAR = 'https://www.hamqth.com/api/v2/solar';
  const MUF = 'https://prop.kc2g.com/renders/current/mufd-normal-now.svg';

  /* ---------- Datos fijos ---------- */

  /**
   * Grupos de bandas del semáforo. Campos:
   *  - bands  Texto que se muestra ("80 · 40 m").
   *  - where  A dónde se suele llegar con esas bandas cuando están abiertas.
   *  - Tipo de regla (solo uno de los tres):
   *      low: true   bandas bajas, mejor de noche;
   *      mid: true   bandas medias, mejor de día;
   *      high: N     bandas altas, solo de día y si el flujo solar llega a N.
   * Están ordenadas de menor a mayor frecuencia: load() usa ese orden para elegir "lo mejor ahora".
   */
  const GROUPS = [
    { bands: '80 · 40 m', low: true, where: 'España y Europa' },
    { bands: '30 · 20 m', mid: true, where: 'Europa, América, Asia' },
    { bands: '17 · 15 m', high: 100, where: 'Otros continentes' },
    { bands: '12 · 10 m', high: 140, where: 'Todo el mundo, con poca potencia' },
  ];
  // Texto y clase CSS (color del semáforo) de cada estado: índice 0 cerrada, 1 floja, 2 abierta.
  const LABEL = ['Cerrada', 'Floja', 'Abierta'];
  const CLASS = ['bad', 'fair', 'good'];

  /* ---------- Estimación ---------- */
  // Reglas sencillas y orientativas a partir del flujo solar (SFI), el índice K y si es de día
  /**
   * Estado estimado de un grupo de bandas (reglas en la cabecera).
   * @param {object} g Grupo de GROUPS.
   * @param {number} sfi Flujo solar (SFI), redondeado.
   * @param {number} k Índice K planetario (0-9).
   * @param {boolean} day true si es de día en la hora local del dispositivo.
   * @returns {0|1|2} 0 cerrada, 1 floja, 2 abierta.
   */
  function estimate(g, sfi, k, day) {
    let v;
    if (g.low) v = day ? 1 : 2;
    else if (g.mid) v = day ? 2 : (sfi >= 120 ? 1 : 0);
    else v = !day ? 0 : sfi >= g.high ? 2 : sfi >= g.high - 25 ? 1 : 0;
    if (k >= 5) v = 0; else if (k >= 4) v = Math.max(0, v - 1);
    return v;
  }

  /**
   * Describe la actividad del Sol según el flujo solar.
   * @param {number} sfi Flujo solar.
   * @returns {string} "muy activo", "activo", "tranquilo" o "muy tranquilo".
   */
  function sunWord(sfi) { return sfi >= 150 ? 'muy activo' : sfi >= 110 ? 'activo' : sfi >= 85 ? 'tranquilo' : 'muy tranquilo'; }
  /**
   * Describe el estado del campo magnético según el índice K (≥ 5 tormenta, 4 agitado, 3 inquieto, < 3 calma).
   * @param {number} k Índice K.
   * @returns {string} Trozo de frase para la frase resumen.
   */
  function fieldWord(k) { return k >= 5 ? 'hay tormenta geomagnética' : k >= 4 ? 'el campo magnético está agitado' : k >= 3 ? 'el campo magnético está algo inquieto' : 'el campo magnético está en calma'; }

  /* ---------- Carga de datos y pintado ---------- */

  /**
   * Descarga los datos solares, calcula el estado de cada grupo y pinta frase, semáforo y fuente.
   * "Lo mejor ahora" es el grupo de MAYOR frecuencia con el estado más alto (lastIndexOf), porque las
   * bandas altas llegan más lejos; solo se recomienda si alguno está abierto (estado 2).
   * Los datos de HamQTH son números y van redondeados, por eso se pueden meter en innerHTML sin escapar.
   * Si falla la red o faltan datos (flujo 0 o sin índice K) se muestra un aviso y no se pinta el semáforo.
   * Efectos: una petición de red; reescribe #propSentence, #propBands, #propExplain y #propMeta.
   * @returns {Promise<void>}
   */
  async function load() {
    const h = new Date().getHours();
    const day = h >= 8 && h < 19;
    try {
      const r = await fetch(SOLAR);
      const s = await r.json();
      // currentKIndex es el valor más reciente; kIndex es el de respaldo (ya viene como entero).
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

  /* ---------- Explicación al tocar una banda ---------- */
  // Qué significa cada estado, en lenguaje llano
  const MEANING = [
    'Ahora casi no se oye nada en estas bandas. No es tu radio: es el Sol o la hora. Prueba en otras o vuelve más tarde.',
    'Se oye algo, con altibajos. Ten paciencia: las señales van y vienen (es el “fading”).',
    'Buen momento: en un receptor web oirás estaciones lejanas con claridad. ¡Aprovecha!',
  ];
  // Un solo escuchador para todos los botones (se repintan en cada carga). data-i = posición en GROUPS,
  // data-s = estado calculado. Marca aria-expanded solo en el tocado y avisa del logro.
  $('propBands').addEventListener('click', e => {
    const b = e.target.closest('.pb'); if (!b) return;
    $('propBands').querySelectorAll('.pb').forEach(x => x.setAttribute('aria-expanded', String(x === b)));
    const g = GROUPS[+b.dataset.i];
    $('propExplain').innerHTML = `<b>${g.bands}:</b> ${MEANING[+b.dataset.s]}`;
    Radio.emit('prop', 'banda');
  });

  /* ---------- Mapa de la MUF y arranque perezoso ---------- */
  $('mufMap').src = MUF;
  $('mufMap').addEventListener('error', () => { $('mufWrap').hidden = true; });

  // Primera carga cuando la sección está a 300 px de verse; después, cada 15 min (15 * 60000 ms).
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); setInterval(load, 15 * 60000); } }, { rootMargin: '300px' });
  io.observe($('propagacion'));
})();
