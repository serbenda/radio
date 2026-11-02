#!/usr/bin/env node
/**
 * tools/check.mjs · Comprobaciones automáticas de la web, sin dependencias (solo Node 18+).
 *
 * Uso:   node tools/check.mjs        (desde cualquier carpeta: las rutas se calculan desde este archivo)
 * Sale con código 1 si algo falla, así que sirve en local y en GitHub Actions
 * (.github/workflows/comprobaciones.yml lo ejecuta en cada pull request).
 *
 * Qué comprueba (detalle en docs/PRUEBAS.md):
 *  1. Páginas: estructura mínima (lang, título, descripción, canónica, un solo <h1>, meta radio-root correcta).
 *  2. Cabecera y pie idénticos en todas las páginas (salvo la ruta relativa a la raíz).
 *  3. Enlaces y recursos locales: todo href/src local existe, incluidos los anclajes #id de otras páginas.
 *  4. Scripts: core.js va el primero, glossary.js el último, y todo archivo de js/ se usa en alguna página.
 *  5. Sintaxis de todos los .js de js/ y de este mismo archivo (node --check).
 *  6. Datos: banco del examen, secciones de la URE, bandas y escucha guiada bien formados.
 *  7. Enlaces de "Tu primer mes" (journey.js) que apuntan a páginas y secciones que existen.
 *  8. sitemap.xml incluye todas las páginas.
 *  9. Modo sin conexión: manifest e iconos válidos, sw.js guarda todas las páginas y módulos, y su
 *     VERSION coincide con la última del CHANGELOG (si no, los navegadores no renuevan la caché).
 * 10. Métricas: cada Radio.track() usa un nombre de hito fijo (sin datos que escriba la persona).
 * 12. Idiomas: cada página en castellano tiene su versión en inglés con las mismas secciones, hreflang y
 *     selector; el examen en inglés tiene las mismas preguntas, opciones y respuestas.
 * 11. Seguridad: misma Content-Security-Policy en todas las páginas, librerías externas con versión fija,
 *     con integridad (SRI), enlaces target="_blank" con rel="noopener", sin tipografías de terceros y tipografías propias presentes.
 *
 * Cómo está hecho: el HTML se analiza con expresiones regulares, no con un analizador de HTML. Es suficiente
 * porque las páginas las escribimos nosotros con un formato estable (atributos con comillas dobles, etc.),
 * pero significa que un cambio de formato (p. ej. comillas simples en un atributo) puede hacer que una
 * comprobación deje de ver algo. Cada expresión regular lleva encima un comentario con lo que busca y un ejemplo.
 *
 * Cómo añadir una comprobación: crea un bloque con section('N. Título') y llama a expect(condición, mensaje)
 * una vez por cosa comprobada. expect() suma al contador y marca el fallo; no hace falta nada más.
 * Si es importante, añádela también a la lista de arriba y a la tabla de docs/PRUEBAS.md.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

/* ---------- Utilidades ---------- */

// ROOT: carpeta raíz del repositorio (la madre de tools/), calculada desde la ruta de este archivo.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * Lee un archivo del repositorio como texto UTF-8.
 * @param {string} p  Ruta relativa a la raíz (p. ej. 'js/journey.js').
 * @returns {string}
 */
const read = p => readFileSync(join(ROOT, p), 'utf8');
// Contadores globales: comprobaciones hechas y fallidas. Se muestran al final y deciden el código de salida.
let failures = 0, checks = 0;
/**
 * Registra una comprobación correcta y la imprime con ✓.
 * @param {string} msg
 * @returns {void}
 */
const ok = msg => { checks++; console.log(`  ✓ ${msg}`); };
/**
 * Registra una comprobación fallida y la imprime con ✗.
 * @param {string} msg
 * @returns {void}
 */
const fail = msg => { checks++; failures++; console.log(`  ✗ ${msg}`); };
/**
 * Llama a ok() o a fail() según la condición. Es la forma normal de escribir una comprobación.
 * @param {*} cond     Cualquier valor: "verdadero" en JavaScript = correcto.
 * @param {string} msg Texto que se imprime en los dos casos (conviene que diga qué falta si falla).
 * @returns {void}
 */
const expect = (cond, msg) => (cond ? ok(msg) : fail(msg));
/**
 * Imprime el título de un bloque de comprobaciones, precedido de una línea en blanco.
 * @param {string} t
 * @returns {void}
 */
const section = t => console.log(`\n${t}`);

/* ---------- Páginas ---------- */
// PAGES: la portada más cada carpeta de primer nivel (que no empiece por '.') con un index.html dentro,
// y lo mismo dentro de en/ (versión inglesa). Ejemplo: ['index.html', 'empezar/index.html', …,
// 'en/index.html', 'en/listen/index.html', …]. Una página nueva entra sola.
// html: { 'empezar/index.html': '<!doctype html>…', … } (contenido de cada página, leído una vez).
/** Páginas (carpetas con index.html) dentro de `base` ('' = raíz), sin carpetas ocultas ni en/. */
const pagesIn = base => [`${base}index.html`, ...readdirSync(join(ROOT, base || '.')).filter(d => !d.startsWith('.') && d !== 'en' && statSync(join(ROOT, base, d)).isDirectory() && existsSync(join(ROOT, base, d, 'index.html'))).map(d => `${base}${d}/index.html`)];
const PAGES = [...pagesIn(''), ...(existsSync(join(ROOT, 'en', 'index.html')) ? pagesIn('en/') : [])];
/** Idioma de una página según su carpeta: 'en' dentro de en/, si no 'es'. */
const langOf = p => (p.startsWith('en/') ? 'en' : 'es');
/** Todos los .js de js/ y sus subcarpetas (js/en/…), como rutas 'js/…'. */
const JSFILES = (function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap(f => statSync(join(ROOT, dir, f)).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith('.js') ? [`${dir}/${f}`] : []);
})('js');
const html = Object.fromEntries(PAGES.map(p => [p, read(p)]));
/**
 * Todos los id="…" de un HTML.
 * Regex /\sid="([^"]+)"/g: un espacio (o salto de línea) seguido de id="…"; captura el valor.
 *   Ejemplo: '<main id="contenido">' → 'contenido'. El espacio obligatorio evita contar data-id="…".
 * @param {string} src  Código HTML.
 * @returns {Set<string>}
 */
const idsOf = src => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

/* ---------- 1. Estructura de cada página ---------- */
section('1. Estructura de cada página');
for (const p of PAGES) {
  // depth: carpetas entre la página y la raíz ('index.html' → 0, 'examen/index.html' → 1).
  // rootExpected: lo que debe decir <meta name="radio-root"> ('./' en la portada, '../' en una subcarpeta);
  // core.js lo usa para construir enlaces entre páginas.
  const s = html[p], depth = p.split('/').length - 1, rootExpected = depth ? '../'.repeat(depth) : './';
  const problems = [];
  // Regex, en orden:
  //   <html lang="es">                     literal.
  //   <title>[^<]+<\/title>                título con al menos un carácter: '<title>Radio</title>'.
  //   content="[^"]{50,}"                  descripción de 50 caracteres o más.
  //   href="https:\/\/radio\.bendi\.dev\/  canónica bajo https://radio.bendi.dev/ (los puntos van escapados).
  //   <h1[\s>]                             '<h1>' o '<h1 class="…">' (y no, por ejemplo, '<h1x'); deben ser exactamente 1.
  //   radio-root" content="([^"]+)"        captura el valor del meta para compararlo con rootExpected.
  //   <body data-page="[a-z]+">            data-page en minúsculas sin espacios: '<body data-page="examen">'.
  if (!new RegExp(`<html lang="${langOf(p)}">`).test(s)) problems.push(`sin lang="${langOf(p)}"`);
  if (!/<title>[^<]+<\/title>/.test(s)) problems.push('sin <title>');
  if (!/<meta name="description" content="[^"]{50,}">/.test(s)) problems.push('descripción ausente o corta');
  if (!/<link rel="canonical" href="https:\/\/radio\.bendi\.dev\/[^"]*">/.test(s)) problems.push('sin canónica');
  if ((s.match(/<h1[\s>]/g) || []).length !== 1) problems.push('no tiene exactamente un <h1>');
  const rootMeta = (s.match(/<meta name="radio-root" content="([^"]+)">/) || [])[1];
  if (rootMeta !== rootExpected) problems.push(`radio-root "${rootMeta}" (debería ser "${rootExpected}")`);
  if (!/<body data-page="[a-z]+">/.test(s)) problems.push('sin data-page en <body>');
  if (!/<main id="contenido">/.test(s)) problems.push('sin <main id="contenido">');
  expect(!problems.length, `${p}${problems.length ? ': ' + problems.join(', ') : ''}`);
}

/* ---------- 2. Cabecera y pie comunes ---------- */
section('2. Cabecera y pie comunes');
/**
 * Extrae el primer fragmento que casa con `re` y quita los prefijos de ruta relativa, para poder comparar
 * la cabecera de una subpágina con la de la portada.
 *   /(href|src)="(\.\.\/)+/g   'href="../../js/x.js"' → 'href="js/x.js"' (uno o más '../').
 *   /(href|src)="\.\//g        'href="./empezar/"'    → 'href="empezar/"'.
 * @param {string} s   HTML de la página.
 * @param {RegExp} re  Qué fragmento extraer.
 * @returns {string} Fragmento normalizado, o '' si no aparece.
 */
const norm = (s, re) => (s.match(re) || [''])[0].replace(/(href|src)="(\.\.\/)+/g, '$1="').replace(/(href|src)="\.\//g, '$1="');
// <header class="top">[\s\S]*?<\/header>: desde la apertura hasta el PRIMER cierre; [\s\S] incluye saltos
// de línea y *? es "lo mínimo posible". Igual con <footer>…</footer>.
// Se compara dentro de cada idioma (la cabecera inglesa tiene otros textos). El selector de idioma
// (<a class="lang-switch" …>) se quita antes de comparar, porque apunta a una página distinta en cada una.
const noSwitch = s => s.replace(/<a class="lang-switch"[^>]*>[^<]*<\/a>/, '');
for (const lg of ['es', 'en']) {
  const group = PAGES.filter(p => langOf(p) === lg);
  if (!group.length) continue;
  for (const [name, re] of [['cabecera', /<header class="top">[\s\S]*?<\/header>/], ['pie', /<footer>[\s\S]*?<\/footer>/]]) {
    const base = noSwitch(norm(html[group[0]], re));
    const diff = group.filter(p => noSwitch(norm(html[p], re)) !== base);
    expect(base && !diff.length, `${name} idéntica en las ${group.length} páginas en ${lg}${diff.length ? ' (distinta en: ' + diff.join(', ') + ')' : ''}`);
  }
}

/* ---------- 3. Enlaces y recursos locales ---------- */
section('3. Enlaces y recursos locales');
for (const p of PAGES) {
  const dir = dirname(p), broken = [];
  // /\s(href|src)="([^"]+)"/g: cada atributo href o src con comillas dobles; captura nombre y valor.
  //   Ejemplo: ' href="../empezar/#clubes"' → attr 'href', url '../empezar/#clubes'.
  for (const [, attr, url] of html[p].matchAll(/\s(href|src)="([^"]+)"/g)) {
    // Lo externo (http, https, mailto, data, tel) no se comprueba aquí: lo revisa tools/enlaces.mjs.
    if (/^(https?:|mailto:|data:|tel:)/.test(url)) continue;
    // Resolver la URL a un archivo: sin ruta ('#seccion') = la misma página; una carpeta ('empezar/', '.', './')
    // = su index.html. relative('.', …) normaliza 'examen/../empezar/index.html' a 'empezar/index.html' y el
    // replace pasa barras de Windows a '/'.
    const [path, anchor] = url.split('#');
    let target = path ? join(dir, path) : p;
    if (path && (path.endsWith('/') || path === '.' || path === './')) target = join(dir, path, 'index.html');
    target = relative('.', target).replace(/\\/g, '/') || 'index.html';
    if (!existsSync(join(ROOT, target))) { broken.push(`${url} (no existe ${target})`); continue; }
    // El anclaje (#id) solo se comprueba si el destino es HTML; se reutiliza el HTML ya leído si es una página.
    if (anchor && target.endsWith('.html')) {
      const ids = idsOf(html[target] ?? read(target));
      if (!ids.has(anchor)) broken.push(`${url} (no hay #${anchor} en ${target})`);
    }
  }
  expect(!broken.length, `${p}: enlaces locales${broken.length ? ' rotos → ' + broken.join('; ') : ' correctos'}`);
}

/* ---------- 4. Scripts ---------- */

// /<script src="(?:\.\.\/|\.\/)?js\/([^"]+)"/g: scripts locales de js/, con o sin '../' o './' delante;
// captura el nombre. Ejemplo: '<script src="../js/exam.js"' → 'exam.js'. Requiere que src sea el PRIMER
// atributo de <script> (así están escritas todas las páginas).
section('4. Scripts');
const used = new Set();
for (const p of PAGES) {
  // (?:(?:\.\.\/)+|\.\/)? admite '../../js/…' (páginas en inglés) y captura también 'en/exam-data.js'.
  const local = [...html[p].matchAll(/<script src="(?:(?:\.\.\/)+|\.\/)?js\/([^"]+)"/g)].map(m => m[1]);
  local.forEach(f => used.add(f));
  // core.js primero porque define Radio, que usan los demás; glossary.js último porque marca la jerga en
  // el texto que los otros módulos ya han pintado.
  expect(local[0] === 'core.js' && local.at(-1) === 'glossary.js', `${p}: core.js primero y glossary.js último`);
}
const unused = JSFILES.map(f => f.slice(3)).filter(f => !used.has(f));
expect(!unused.length, `todo archivo de js/ se usa en alguna página${unused.length ? ' (sin usar: ' + unused.join(', ') + ')' : ''}`);

/* ---------- 5. Sintaxis de JavaScript ---------- */

// node --check analiza el archivo sin ejecutarlo. tools/enlaces.mjs no está en la lista.
section('5. Sintaxis de JavaScript');
const jsFiles = JSFILES.concat('tools/check.mjs');
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); ok(f); }
  catch (e) { fail(`${f}: ${String(e.stderr || e.message).split('\n').slice(0, 3).join(' ')}`); }
}

/* ---------- 6. Datos ---------- */

// Los archivos de datos se ejecutan en un contexto aislado de vm (sin window, document ni acceso al disco).
// Las `const` de nivel superior (BANDS, EXAM…) no se convierten en propiedades del objeto global, así que
// tras cada archivo se añade un fragmento que las copia a globalThis.__; `typeof` evita el error de las
// que aún no existen. Los tres archivos comparten contexto, así que al final __ tiene las cuatro listas.
section('6. Datos');
const sandbox = {};
vm.createContext(sandbox);
for (const f of ['js/data.js', 'js/exam-data.js', 'js/clubs-data.js']) vm.runInContext(read(f) + '\n;globalThis.__=Object.assign(globalThis.__||{}, {BANDS:typeof BANDS!=="undefined"?BANDS:undefined, LISTEN:typeof LISTEN!=="undefined"?LISTEN:undefined, EXAM:typeof EXAM!=="undefined"?EXAM:undefined, URE_SECTIONS:typeof URE_SECTIONS!=="undefined"?URE_SECTIONS:undefined});', sandbox, { filename: f });
const D = sandbox.__;
{
  // Banco del examen: ids únicos; cada pregunta con parte 1 o 2, tema, enunciado, al menos 3 opciones sin
  // repetir, `ok` dentro de rango y explicación; y al menos 30 por parte (lo que saca el simulacro).
  const E = D.EXAM, ids = new Set(E.map(q => q.id));
  expect(ids.size === E.length, `examen: ${E.length} preguntas con id único`);
  const bad = E.filter(q => ![1, 2].includes(q.p) || !q.t || !q.q || !Array.isArray(q.a) || q.a.length < 3 || !(q.ok >= 0 && q.ok < q.a.length) || !q.why || new Set(q.a).size !== q.a.length);
  expect(!bad.length, `examen: todas tienen parte, tema, ≥3 opciones distintas, respuesta válida y explicación${bad.length ? ' (fallan: ' + bad.map(q => q.id).join(', ') + ')' : ''}`);
  for (const p of [1, 2]) { const n = E.filter(q => q.p === p).length; expect(n >= 30, `examen: parte ${p} tiene ${n} preguntas (el simulacro necesita 30)`); }
  // Versión inglesa (js/en/exam-data.js): mismas preguntas, mismo orden de opciones y misma respuesta.
  // Si no coinciden, el progreso guardado (por id) y la corrección serían distintos en cada idioma.
  if (existsSync(join(ROOT, 'js/en/exam-data.js'))) {
    const sb = {}; vm.createContext(sb);
    vm.runInContext(read('js/en/exam-data.js') + '\n;globalThis.__E=EXAM;', sb, { filename: 'js/en/exam-data.js' });
    const EN = sb.__E, byId = Object.fromEntries(EN.map(q => [q.id, q]));
    const off = E.filter(q => { const x = byId[q.id]; return !x || x.p !== q.p || x.ok !== q.ok || x.a.length !== q.a.length || !x.q || !x.why || new Set(x.a).size !== x.a.length; });
    expect(EN.length === E.length && !off.length, `examen en inglés: las ${E.length} preguntas con el mismo id, parte, número de opciones y respuesta${off.length ? ' (revisar: ' + off.map(q => q.id).slice(0, 12).join(', ') + ')' : ''}${EN.length !== E.length ? ` (hay ${EN.length})` : ''}`);
  }
}
{
  // Radioclubes. Regex:
  //   /^E[A-H]\d[A-Z0-9]{1,4}$/  indicativo español: E, letra A-H, una cifra y 1-4 letras o cifras.
  //                              'EA4URA' sí; 'EA4' o 'ea4ura' no. Un indicativo vacío ("") se admite.
  //   /^https?:\/\//             web que empieza por http:// o https:// (vacía también se admite).
  //   /@|\b\d{9}\b|Presidente/i  datos personales: una '@' (correo), 9 cifras seguidas como palabra
  //                              ('912345678'; un teléfono con espacios no lo detecta) o "presidente" en
  //                              cualquier mayúscula/minúscula. Ver la regla de privacidad en clubs-data.js.
  // U.length > 100 detecta un archivo truncado por error.
  const U = D.URE_SECTIONS;
  const bad = U.filter(r => r.length !== 4 || !r[0] || !r[1] || (r[2] && !/^E[A-H]\d[A-Z0-9]{1,4}$/.test(r[2])) || (r[3] && !/^https?:\/\//.test(r[3])));
  expect(U.length > 100 && !bad.length, `radioclubes: ${U.length} secciones con formato válido${bad.length ? ' (fallan: ' + bad.map(r => r[1]).join(', ') + ')' : ''}`);
  const personal = U.filter(r => r.join(' ').match(/@|\b\d{9}\b|Presidente/i));
  expect(!personal.length, 'radioclubes: ningún dato personal (correos, teléfonos, nombres de cargos)');
}
{
  // Bandas: cada una con from < to y ordenadas de menor a mayor frecuencia de inicio.
  // Escucha guiada: /^\d+(lsb|usb|cw|am)$/ = kHz seguidos del modo, sin espacios: '7150lsb'.
  const sorted = D.BANDS.every((b, i, a) => b.from < b.to && (!i || a[i - 1].from < b.from));
  expect(sorted, 'bandas: rangos válidos y ordenados');
  const badTune = D.LISTEN.filter(l => !/^\d+(lsb|usb|cw|am)$/.test(l.tune));
  expect(!badTune.length, 'escucha guiada: sintonías con formato <kHz><modo>');
}

/* ---------- 7. Enlaces de "Tu primer mes" ---------- */

// /href: '([^']+)'/g: cada propiedad href: '…' de journey.js. Ejemplo: "href: 'empezar/#clubes'" → 'empezar/#clubes'.
// Cada ruta se convierte en página: 'empezar/' → 'empezar/index.html'; './' o '' → 'index.html'.
// Además se exige que haya al menos 10, por si un cambio de formato hace que la regex deje de encontrarlos.
section('7. Enlaces de "Tu primer mes"');
{
  const hrefs = [...read('js/journey.js').matchAll(/href: '([^']+)'/g)].map(m => m[1]);
  const broken = hrefs.filter(h => {
    const [path, anchor] = h.split('#');
    const page = path ? `${path.replace(/\/$/, '')}/index.html`.replace(/^\.\//, '').replace(/^\/index\.html$/, 'index.html') : 'index.html';
    const target = page === '/index.html' || page === './index.html' ? 'index.html' : page;
    if (!html[target]) return true;
    return anchor && !idsOf(html[target]).has(anchor);
  });
  expect(hrefs.length >= 10 && !broken.length, `${hrefs.length} enlaces${broken.length ? ' (rotos: ' + broken.join(', ') + ')' : ' correctos'}`);
}

/* ---------- 8. sitemap.xml ---------- */

// Cada página debe aparecer como <loc>https://radio.bendi.dev/<carpeta>/</loc> (la portada, sin carpeta).
section('8. sitemap.xml');
{
  const sm = read('sitemap.xml');
  const missing = PAGES.map(p => 'https://radio.bendi.dev/' + p.replace('index.html', '')).filter(u => !sm.includes(`<loc>${u}</loc>`));
  expect(!missing.length, `incluye las ${PAGES.length} páginas${missing.length ? ' (faltan: ' + missing.join(', ') + ')' : ''}`);
  // El archivo CNAME le dice a GitHub Pages que sirva la web en radio.bendi.dev (docs/DECISIONES.md D21).
  // Si falta o cambia, la web vuelve a bendi.dev/radio/ y las canónicas de arriba dejan de ser verdad.
  let cname = '';
  try { cname = read('CNAME').trim(); } catch { /* sin CNAME */ }
  expect(cname === 'radio.bendi.dev', `CNAME con radio.bendi.dev${cname && cname !== 'radio.bendi.dev' ? ' (dice: ' + cname + ')' : cname ? '' : ' (no existe)'}`);
}

/* ---------- 9. Instalable y sin conexión ---------- */
section('9. Instalable y sin conexión');
{
  let man = null;
  try { man = JSON.parse(read('manifest.webmanifest')); } catch (e) { /* inválido */ }
  expect(man && man.name && man.start_url && man.icons && man.icons.length >= 2, 'manifest.webmanifest es JSON válido con nombre, inicio e iconos');
  // Iconos y capturas (las capturas salen en la ventana de instalación de Android).
  const icons = man ? [...man.icons, ...(man.screenshots || [])].map(i => i.src).filter(src => !existsSync(join(ROOT, src))) : ['?'];
  expect(!icons.length, `iconos y capturas del manifest existen${icons.length ? ' (faltan: ' + icons.join(', ') + ')' : ''}`);
  expect(PAGES.every(p => /rel="manifest"/.test(html[p])), 'todas las páginas enlazan el manifest');
  const sw = read('sw.js');
  // /'(\.\/[^']*)'/g: toda cadena entre comillas simples que empiece por './' en sw.js (la lista PRECACHE).
  //   Ejemplo: "'./js/exam.js'" → './js/exam.js'. Las que acaban en '/' son carpetas: se busca su index.html.
  const pre = [...sw.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
  const missingFiles = pre.filter(f => !existsSync(join(ROOT, f.endsWith('/') ? f + 'index.html' : f)));
  expect(!missingFiles.length, `sw.js: todo lo de PRECACHE existe${missingFiles.length ? ' (faltan: ' + missingFiles.join(', ') + ')' : ''}`);
  const pagesOut = PAGES.map(p => './' + p.replace('index.html', '')).filter(p => !pre.includes(p));
  const jsOut = JSFILES.map(f => `./${f}`).filter(f => !pre.includes(f));
  expect(!pagesOut.length && !jsOut.length, `sw.js guarda las ${PAGES.length} páginas y todos los módulos${pagesOut.length || jsOut.length ? ' (faltan: ' + [...pagesOut, ...jsOut].join(', ') + ')' : ''}`);
  // /^const VERSION = '([^']+)'/m  captura la versión de sw.js: "const VERSION = '2.2.0'" → '2.2.0'.
  //                              Solo al principio de una línea, para no leer ejemplos dentro de comentarios.
  // /^## \[([^\]]+)\]/m         primer título de versión del CHANGELOG: '## [2.2.0] · 1 de noviembre…' → '2.2.0'.
  //                              La bandera m hace que ^ signifique "principio de cualquier línea".
  const v = (sw.match(/^const VERSION = '([^']+)'/m) || [])[1];
  const last = (read('CHANGELOG.md').match(/^## \[([^\]]+)\]/m) || [])[1];
  expect(v && v === last, `VERSION de sw.js (${v}) = última versión del CHANGELOG (${last})`);
}

/* ---------- 10. Métricas ---------- */

// /Radio\.track\(([^;]*?)\);/g captura el argumento de cada Radio.track(…); hasta el primer ');'.
// Se acepta solo: un texto fijo con minúsculas, cifras, '/' y '-' ('examen/simulacro'), o una plantilla
// con ${…} que sea una de las expresiones internas de la lista. Ejemplo válido:
//   Radio.track(`examen/simulacro-${pass ? 'apto' : 'no-apto'}`)
// Si añades un hito con otra variable interna (nunca texto que escriba la persona), añádela a la lista.
// Los comentarios se quitan antes de buscar (sinComentarios), así que en ellos se puede escribir Radio.track(…).
/**
 * Quita las líneas que son solo comentario (empiezan por //, /* o *). Basta para este proyecto porque
 * los comentarios siempre van en líneas propias (regla de CONTRIBUTING.md).
 * @param {string} src Código fuente.
 * @returns {string} El código sin esas líneas.
 */
const sinComentarios = src => src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
section('10. Métricas');
{
  const bad = [];
  for (const f of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js'))) {
    for (const m of sinComentarios(read(`js/${f}`)).matchAll(/Radio\.track\(([^;]*?)\);/g)) {
      const arg = m[1];
      // Solo literales o plantillas con variables internas conocidas (escenario, id de lección, nivel, semana, apto).
      if (!/^['`][a-z0-9\/\-]*(\$\{(scenario|current\.id|st\.level|wi \+ 1|pass \? 'apto' : 'no-apto')\}[a-z0-9\/\-]*)*['`]$/.test(arg)) bad.push(`${f}: ${arg}`);
    }
  }
  expect(!bad.length, `hitos con nombres fijos${bad.length ? ' (revisar: ' + bad.join(' | ') + ')' : ''}`);
}

/* ---------- 11. Seguridad y recursos externos ---------- */
section('11. Seguridad y recursos externos');
{
  /**
   * Valor del <meta http-equiv="Content-Security-Policy" content="…"> de una página.
   * @param {string} p  Página (clave de `html`).
   * @returns {string|undefined}
   */
  const csp = p => (html[p].match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1];
  const base = csp('index.html');
  expect(base && PAGES.every(p => csp(p) === base), 'misma Content-Security-Policy en todas las páginas');
  // La web no enseña el código (decisión D22): ningún enlace al repositorio salvo para avisar de un error
  // (…/issues/new…). /https:\/\/github\.com\/serbenda\/radio(?!\/issues\/new)/ encuentra
  // 'https://github.com/serbenda/radio' o '…/radio/blob/…' pero no '…/radio/issues/new/choose'.
  // GitHub Sponsors (github.com/sponsors/serbenda) no es el repositorio y se permite.
  const codeLinks = PAGES.filter(p => /https:\/\/github\.com\/serbenda\/radio(?!\/issues\/new)/.test(html[p]));
  expect(!codeLinks.length, `sin enlaces al código en las páginas${codeLinks.length ? ' (hay en: ' + codeLinks.join(', ') + ')' : ''}`);
  // Librerías de cdnjs: /<(?:script|link)[^>]+(?:src|href)="(https:\/\/cdnjs[^"]+)"/g captura la URL de cada
  // <script> o <link> que apunta a cdnjs, y /\/\d+\.\d+\.\d+\// exige una versión exacta en la ruta:
  //   '…/ajax/libs/leaflet/1.9.4/leaflet.js' sí; '…/leaflet/latest/leaflet.js' no.
  const unpinned = PAGES.flatMap(p => [...html[p].matchAll(/<(?:script|link)[^>]+(?:src|href)="(https:\/\/cdnjs[^"]+)"/g)].map(m => m[1]))
    .filter(u => !/\/\d+\.\d+\.\d+\//.test(u));
  expect(!unpinned.length, `librerías de cdnjs con versión fija${unpinned.length ? ' (sin versión: ' + unpinned.join(', ') + ')' : ''}`);
  // Además cada etiqueta de cdnjs debe llevar integrity="sha256-…" (o sha384/sha512, en base64) y
  // crossorigin="anonymous": el navegador rechaza el archivo si alguien lo cambia en el CDN.
  const noSri = PAGES.flatMap(p => [...html[p].matchAll(/<(?:script|link)[^>]+(?:src|href)="https:\/\/cdnjs[^>]+>/g)].map(m => m[0]))
    .filter(t => !/integrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/.test(t) || !/crossorigin="anonymous"/.test(t));
  expect(!noSri.length, `librerías de cdnjs con integridad (SRI) y crossorigin${noSri.length ? ' (faltan: ' + noSri.length + ')' : ''}`);
  // /<a\b[^>]*target="_blank"[^>]*>/g: la etiqueta de apertura completa de cada <a … target="_blank" …>.
  // Se buscan en las páginas y también en js/, porque los módulos generan enlaces dentro de plantillas.
  // Cada una debe tener rel="… noopener …" para que la página abierta no pueda controlar esta.
  const blank = [];
  for (const f of [...PAGES, ...JSFILES]) {
    for (const m of read(f).matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) blank.push(`${f}: ${m[0].slice(0, 60)}`);
  }
  expect(!blank.length, `enlaces que abren pestaña nueva con rel="noopener"${blank.length ? ' (faltan: ' + blank.slice(0, 5).join(' | ') + ')' : ''}`);
  // Tipografías: ninguna página carga Google Fonts, y cada url('../fonts/…') de css/style.css existe.
  //   /url\('\.\.\/(fonts\/[^']+)'\)/g: "url('../fonts/atkinson-400.woff2')" → 'fonts/atkinson-400.woff2'.
  expect(PAGES.every(p => !/fonts\.googleapis|fonts\.gstatic/.test(html[p])), 'sin tipografías de terceros (todas en fonts/)');
  // Atributos de evento en el HTML (onclick="…", onsubmit="…"): la CSP los bloquea (no hay 'unsafe-inline' en
  // script-src), así que no funcionarían. Regex: espacio + on + letras + =".
  const inline = PAGES.filter(p => /\son[a-z]+="/i.test(html[p]));
  expect(!inline.length, `sin manejadores de eventos en el HTML (la CSP los bloquearía)${inline.length ? ' (en: ' + inline.join(', ') + ')' : ''}`);
  const faces = [...read('css/style.css').matchAll(/url\('\.\.\/(fonts\/[^']+)'\)/g)].map(m => m[1]);
  const missing = faces.filter(f => !existsSync(join(ROOT, f)));
  expect(faces.length >= 3 && !missing.length, `tipografías de @font-face presentes${missing.length ? ' (faltan: ' + missing.join(', ') + ')' : ''}`);
}

/* ---------- Resumen y código de salida ---------- */

// Código 1 si algo ha fallado: GitHub Actions marca la pull request en rojo.
/* ---------- 12. Idiomas ---------- */
// Cada página en castellano tiene su versión en inglés (en/<carpeta inglesa>/) con las mismas secciones
// (mismos id de <section>), el mismo idioma declarado, enlaces hreflang en las dos y el selector de idioma.
section('12. Idiomas');
if (existsSync(join(ROOT, 'en', 'index.html'))) {
  const SLUGS = { escuchar: 'listen', entender: 'understand', practicar: 'practice', examen: 'exam', empezar: 'start' };
  const es = PAGES.filter(p => langOf(p) === 'es');
  const pairOf = p => (p === 'index.html' ? 'en/index.html' : `en/${SLUGS[p.split('/')[0]] || p.split('/')[0]}/index.html`);
  const missing = es.filter(p => !html[pairOf(p)]);
  expect(!missing.length, `cada página tiene su versión en inglés${missing.length ? ' (faltan: ' + missing.map(pairOf).join(', ') + ')' : ''}`);
  // /<section id="([^"]+)"/g: id de cada <section>. Las dos versiones deben tener las mismas y en el mismo orden.
  const secs = s => [...s.matchAll(/<section id="([^"]+)"/g)].map(m => m[1]).join(',');
  const diffSec = es.filter(p => html[pairOf(p)] && secs(html[p]) !== secs(html[pairOf(p)]));
  expect(!diffSec.length, `mismas secciones en castellano y en inglés${diffSec.length ? ' (distintas en: ' + diffSec.join(', ') + ')' : ''}`);
  const dp = s => (s.match(/<body data-page="([a-z]+)">/) || [])[1];
  const diffPage = es.filter(p => html[pairOf(p)] && dp(html[p]) !== dp(html[pairOf(p)]));
  expect(!diffPage.length, `mismo data-page en las dos versiones${diffPage.length ? ' (distinto en: ' + diffPage.join(', ') + ')' : ''}`);
  const noAlt = PAGES.filter(p => !/hreflang="es"/.test(html[p]) || !/hreflang="en"/.test(html[p]) || !/hreflang="x-default"/.test(html[p]));
  expect(!noAlt.length, `enlaces hreflang es, en y x-default en todas${noAlt.length ? ' (faltan en: ' + noAlt.join(', ') + ')' : ''}`);
  const noSw = PAGES.filter(p => !/id="langSwitch"/.test(html[p]));
  expect(!noSw.length, `selector de idioma en todas${noSw.length ? ' (falta en: ' + noSw.join(', ') + ')' : ''}`);
}

console.log(`\n${failures ? '✗' : '✓'} ${checks - failures} de ${checks} comprobaciones correctas${failures ? `, ${failures} fallan` : ''}.`);
process.exit(failures ? 1 : 0);
