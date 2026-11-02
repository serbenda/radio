/**
 * beacons.js · "Las balizas, ahora": qué baliza de la red NCDXF/IARU está transmitiendo en cada banda.
 *
 * Página: Entender (#balizas), en castellano e inglés. Necesita: #beaconBoard (tabla), #beaconClock y
 * #beaconNext. Textos con Radio.t. No guarda nada ni pide nada a internet: el horario se calcula con la hora.
 *
 * La red: 18 balizas repartidas por el mundo transmiten por turnos en 5 frecuencias (14,100 · 18,110 ·
 * 21,150 · 24,930 · 28,200 MHz). Cada transmisión dura 10 s: el indicativo en Morse a 100 W y cuatro rayas
 * a 100, 10, 1 y 0,1 W. El ciclo completo dura 3 minutos (18 × 10 s) y está sincronizado por GPS.
 * Regla (NCDXF): T = (minuto UTC mod 3) × 60 + segundo; i = T div 10 (0…17); en la banda k (0 = 14,100 …
 * 4 = 28,200) transmite la baliza número (i − k) mod 18 de la lista BEACONS. Así, a las hh:00:00 UTC, 4U1UN
 * está en 14,100 y a las hh:00:10 pasa a 18,110 mientras VE8AT entra en 14,100.
 * Fuente: https://www.ncdxf.org/beacon/ (lista de enero de 2024 en Wikipedia, "International Beacon Project").
 *
 * Cómo usarla: si oyes la baliza de Japón en 20 m, la banda está abierta hacia Japón. Cuántas rayas oyes
 * dice cuánta potencia hace falta (si oyes la de 0,1 W, ¡con 100 mW llegarías!).
 * Rendimiento: actualiza cada segundo solo mientras la sección se ve (Radio.whileVisible).
 * Cómo modificarlo: si cambia la lista, edita BEACONS (orden oficial de rotación).
 */
(() => {
  'use strict';
  const board = document.getElementById('beaconBoard');
  if (!board) return;
  const { $, t, esc } = Radio;
  const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';

  /** Orden oficial de rotación: [indicativo, lugar, país en castellano, país en inglés, bandera]. */
  const BEACONS = [
    ['4U1UN', 'Nueva York', 'ONU', 'United Nations', '🇺🇳'], ['VE8AT', 'Inuvik', 'Canadá', 'Canada', '🇨🇦'],
    ['W6WX', 'California', 'EE. UU.', 'USA', '🇺🇸'], ['KH6RS', 'Maui', 'Hawái', 'Hawaii', '🇺🇸'],
    ['ZL6B', 'Masterton', 'Nueva Zelanda', 'New Zealand', '🇳🇿'], ['VK6RBP', 'Perth', 'Australia', 'Australia', '🇦🇺'],
    ['JA2IGY', 'Monte Asama', 'Japón', 'Japan', '🇯🇵'], ['RR9O', 'Novosibirsk', 'Rusia', 'Russia', '🇷🇺'],
    ['VR2B', 'Hong Kong', 'China', 'China', '🇭🇰'], ['4S7B', 'Colombo', 'Sri Lanka', 'Sri Lanka', '🇱🇰'],
    ['ZS6DN', 'Pretoria', 'Sudáfrica', 'South Africa', '🇿🇦'], ['5Z4B', 'Kariobangi', 'Kenia', 'Kenya', '🇰🇪'],
    ['4X6TU', 'Tel Aviv', 'Israel', 'Israel', '🇮🇱'], ['OH2B', 'Lohja', 'Finlandia', 'Finland', '🇫🇮'],
    ['CS3B', 'Madeira', 'Portugal', 'Portugal', '🇵🇹'], ['LU4AA', 'Buenos Aires', 'Argentina', 'Argentina', '🇦🇷'],
    ['OA4B', 'Lima', 'Perú', 'Peru', '🇵🇪'], ['YV5B', 'Caracas', 'Venezuela', 'Venezuela', '🇻🇪'],
  ];
  /** Bandas: [frecuencia en kHz, nombre de la banda]. El índice es k en la regla de la cabecera. */
  const BANDS = [[14100, '20 m'], [18110, '17 m'], [21150, '15 m'], [24930, '12 m'], [28200, '10 m']];

  /**
   * Baliza que transmite en la banda k en el instante `d`, y segundos que le quedan.
   * @param {Date} d
   * @param {number} k Índice de banda (0…4).
   * @returns {{b: Array, left: number}}
   */
  function onAir(d, k) {
    const T = (d.getUTCMinutes() % 3) * 60 + d.getUTCSeconds();
    const i = Math.floor(T / 10);
    return { b: BEACONS[(((i - k) % 18) + 18) % 18], left: 10 - (T % 10) };
  }

  /** Pinta la tabla (una fila por banda), el reloj UTC y quién viene después en 20 m. */
  function render() {
    const now = new Date();
    board.innerHTML = BANDS.map(([khz, name], k) => {
      const { b } = onAir(now, k);
      const f = (khz / 1000).toLocaleString(Radio.locale, { minimumFractionDigits: 3 });
      return `<tr><td class="mono">${f} MHz<br><small>${name}</small></td>
        <td><span aria-hidden="true">${b[4]}</span> <b class="mono">${b[0]}</b><br><small>${esc(b[1])}, ${esc(t(b[2], b[3]))}</small></td>
        <td><a class="btn small ghost" href="${WEBSDR}${khz}cw" target="_blank" rel="noopener">🎧 ${t('Escuchar', 'Listen')}</a></td></tr>`;
    }).join('');
    const { left } = onAir(now, 0);
    $('beaconClock').textContent = now.toISOString().slice(11, 19) + ' UTC';
    const next = onAir(new Date(now.getTime() + left * 1000), 0).b;
    $('beaconNext').textContent = t(`En ${left} s entra ${next[0]} (${next[2]}) en 14,100 MHz.`, `In ${left} s, ${next[0]} (${next[3]}) comes on 14.100 MHz.`);
  }

  let timer = null;
  Radio.whileVisible(board, () => { render(); timer = setInterval(render, 1000); }, () => { clearInterval(timer); timer = null; });
  render();
  // Abrir un receptor desde aquí cuenta como logro "websdr" (lo registra journey.js al detectar el enlace).
})();
