#!/usr/bin/env node
/**
 * tools/enlaces.mjs · Comprueba que los enlaces EXTERNOS de la web siguen vivos.
 *
 * Uso:   node tools/enlaces.mjs            (informe en pantalla; sale con 1 si hay enlaces rotos)
 *        node tools/enlaces.mjs --md       (informe en Markdown, para abrir un aviso en GitHub)
 *        node tools/enlaces.mjs --lista    (solo lista las URL que revisaría, sin conectarse)
 * Necesita Node 18+ (usa fetch y AbortSignal.timeout) y conexión a internet. Sin dependencias.
 *
 * Lo ejecuta cada lunes .github/workflows/enlaces.yml, que abre o actualiza un aviso con la
 * etiqueta "enlaces" si algo falla. No va en tools/check.mjs porque depende de internet y de
 * servidores ajenos: un servidor caído un rato no debe bloquear una pull request.
 *
 * Qué revisa: todas las URL http(s) que aparecen en los .html y .js del sitio (fuera de docs/, tools/,
 * fonts/, img/, node_modules/ y carpetas ocultas), salvo las de la lista SKIP: servicios que la web
 * consulta en directo (APIs, teselas, CDN), que tienen su propio mensaje de error en la web, las de
 * plantilla (con ${...}) y las de la propia web.
 *
 * Cómo decide (función probe):
 *   - Pide la URL con HEAD; si el servidor no admite HEAD (405 o 501) o la conexión falla, prueba con GET.
 *   - Límite de 20 s por petición. Si no hay respuesta válida, hasta 3 rondas, esperando 2, 4 y 6 s.
 *   - Cualquier otra respuesta (también un 404) se acepta a la primera, sin reintentar.
 *   - ROTO: sin respuesta (DNS, conexión, tiempo agotado), 404, 410 o 5xx. Hace fallar el informe.
 *   - DUDOSO: 401, 403 o 429 (muchos servidores bloquean robots). Se lista, pero no hace fallar.
 *   - Todo lo demás (2xx, redirecciones ya seguidas, otros 4xx) cuenta como bueno y no se muestra.
 *   Revisa 8 enlaces a la vez para no tardar mucho sin saturar a nadie.
 *
 * Cómo arreglar un enlace roto: docs/GUIA.md#un-enlace-externo-se-ha-roto.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------- Configuración ---------- */

// ROOT: raíz del repositorio (la carpeta madre de tools/). MD: si se pidió el informe en Markdown.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MD = process.argv.includes('--md');
// SKIP: expresiones regulares; una URL que case con cualquiera de ellas no se revisa. Para dejar de revisar
// un dominio, añade aquí su regex con los puntos escapados (p. ej. /ejemplo\.com/).
// /\$\{/ descarta las URL de plantilla con ${…}; /bendi\.dev\/radio/ las de esta misma web.
// Servicios que la web consulta en directo (no son enlaces para la persona) o raíces sin página.
const SKIP = [/api\.radio-browser\.info/, /hamqth\.com\/api/, /celestrak\.org\/NORAD/, /goatcounter\.com/, /gc\.zgo\.at/,
  /arcgisonline\.com/, /prop\.kc2g\.com\/renders/, /cdnjs\.cloudflare\.com/, /upload\.wikimedia\.org/, /\$\{/, /bendi\.dev\/radio/,
  /github\.com\/serbenda\/radio\/issues\/new/];

/* ---------- Recogida de URL ---------- */

/**
 * Lista recursiva de los archivos .html y .js bajo `dir`, sin carpetas ocultas (las que empiezan por '.')
 * ni docs/, tools/, node_modules/, fonts/ o img/ (no son parte de lo que ve la persona o no tienen enlaces).
 * @param {string} dir  Ruta absoluta de la carpeta.
 * @returns {string[]} Rutas absolutas.
 */
function files(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (f.startsWith('.') || ['docs', 'tools', 'node_modules', 'fonts', 'img'].includes(f)) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(html|js)$/.test(f) ? [p] : [];
  });
}

// found: URL → lista de archivos (relativos a ROOT) donde aparece; sirve para decir en el informe dónde arreglarla.
const found = new Map(); // url -> [archivos]
for (const f of files(ROOT)) {
  // /https?:\/\/[^\s"'`<>)\]]+/g: "http://" o "https://" y todo lo que siga hasta un espacio, una comilla
  // (simple, doble o invertida), '<', '>', ')' o ']'. Así una URL dentro de href="…", de una plantilla o
  // entre paréntesis termina donde debe. Después se quitan '.', ',' y ';' finales (fin de frase).
  //   Ejemplo: '(ver https://www.ure.es/secciones/).' → 'https://www.ure.es/secciones/'.
  for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'`<>)\]]+/g)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (SKIP.some(re => re.test(url))) continue;
    const list = found.get(url) || [];
    const rel = relative(ROOT, f);
    if (!list.includes(rel)) list.push(rel);
    found.set(url, list);
  }
}

/* ---------- Comprobación de cada URL ---------- */

/**
 * Pide una URL y devuelve su código HTTP, con los reintentos explicados en la cabecera.
 * Sigue redirecciones (redirect: 'follow'), así que el código es el de la página final.
 * Envía un User-Agent propio que identifica el comprobador ante el servidor.
 * @param {string} url
 * @returns {Promise<{code:number, err?:string}>} code 0 si no hubo respuesta; err es entonces el código
 *   del error de red (p. ej. 'ENOTFOUND' para un fallo de DNS, 'TimeoutError' si pasan los 20 s) o el
 *   último código 405/501 recibido.
 */
async function probe(url) {
  let last = '';
  for (let i = 0; i < 3; i++) {
    for (const method of ['HEAD', 'GET']) {
      try {
        const r = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(20000),
          headers: { 'User-Agent': 'Mozilla/5.0 (comprobador de enlaces de bendi.dev/radio)' } });
        if (r.status === 405 || r.status === 501) { last = String(r.status); continue; } // no admite HEAD
        return { code: r.status };
      } catch (e) { last = e.cause?.code || e.name; }
    }
    // Espera creciente entre rondas: 2 s, 4 s y 6 s (da tiempo a un servidor saturado a recuperarse).
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return { code: 0, err: last };
}

/* ---------- Ejecución ---------- */

// URL únicas en orden alfabético (el informe sale siempre en el mismo orden). Con --lista se imprimen y se sale.
const urls = [...found.keys()].sort();
if (process.argv.includes('--lista')) { for (const u of urls) console.log(u); console.log(`\n${urls.length} enlaces.`); process.exit(0); }
const broken = [], doubtful = [];
// Cola compartida por 8 "trabajadores" que se ejecutan a la vez: cada uno saca la siguiente URL hasta
// vaciarla. Como JavaScript ejecuta un trozo de código cada vez, queue.shift() nunca entrega la misma
// URL a dos trabajadores.
const queue = [...urls];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const r = await probe(url);
    if (r.code === 0 || r.code === 404 || r.code === 410 || r.code >= 500) broken.push({ url, ...r });
    else if (r.code === 403 || r.code === 429 || r.code === 401) doubtful.push({ url, ...r });
  }
}));

/* ---------- Informe ---------- */

/**
 * Una línea del informe: "código o error · URL · en archivo1, archivo2".
 * @param {{url:string, code:number, err?:string}} x
 * @returns {string}
 */
const line = x => `${x.code || x.err} · ${x.url} · en ${found.get(x.url).join(', ')}`;
// --md: Markdown para el aviso de GitHub (casillas "- [ ]" para ir marcando los arreglados).
// Sin opciones: texto con ✗ (roto) y ? (dudoso).
if (MD) {
  console.log(`Comprobación del ${new Date().toISOString().slice(0, 10)}: ${urls.length} enlaces externos.\n`);
  console.log(broken.length ? `### Rotos (${broken.length})\n\n${broken.map(x => `- [ ] ${line(x)}`).join('\n')}\n` : 'Ningún enlace roto.\n');
  if (doubtful.length) console.log(`### Dudosos (${doubtful.length}): el servidor no deja pasar robots; revisar a mano\n\n${doubtful.map(x => `- ${line(x)}`).join('\n')}\n`);
  console.log('Cómo arreglarlos: docs/GUIA.md#un-enlace-externo-se-ha-roto');
} else {
  console.log(`${urls.length} enlaces externos revisados.`);
  for (const x of broken) console.log(`  ✗ ${line(x)}`);
  for (const x of doubtful) console.log(`  ? ${line(x)}`);
  console.log(broken.length ? `\n✗ ${broken.length} rotos.` : '\n✓ Ninguno roto.');
}
// Código 1 solo si hay rotos: el flujo semanal lo usa para decidir si abre el aviso.
process.exit(broken.length ? 1 : 0);
