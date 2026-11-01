#!/usr/bin/env node
/**
 * tools/check.mjs · Comprobaciones automáticas de la web, sin dependencias (solo Node 18+).
 *
 * Uso:   node tools/check.mjs
 * Sale con código 1 si algo falla, así que sirve en local y en GitHub Actions
 * (.github/workflows/comprobaciones.yml lo ejecuta en cada pull request).
 *
 * Qué comprueba (detalle en docs/PRUEBAS.md):
 *  1. Páginas: estructura mínima (lang, título, descripción, canónica, un solo <h1>, meta radio-root correcta).
 *  2. Cabecera y pie idénticos en todas las páginas (salvo la ruta relativa a la raíz).
 *  3. Enlaces y recursos locales: todo href/src local existe, incluidos los anclajes #id de otras páginas.
 *  4. Scripts: core.js va el primero, glossary.js el último, y todo archivo de js/ se usa en alguna página.
 *  5. Sintaxis de todos los .js (node --check).
 *  6. Datos: banco del examen, secciones de la URE, bandas y escucha guiada bien formados.
 *  7. Enlaces de "Tu primer mes" (journey.js) que apuntan a páginas y secciones que existen.
 *  8. sitemap.xml incluye todas las páginas.
 *  9. Modo sin conexión: manifest e iconos válidos, sw.js guarda todas las páginas y módulos, y su
 *     VERSION coincide con la última del CHANGELOG (si no, los navegadores no renuevan la caché).
 * 10. Métricas: cada Radio.track() usa un nombre de hito fijo (sin datos que escriba la persona).
 * 11. Seguridad: misma Content-Security-Policy en todas las páginas, librerías externas con versión fija,
 *     con integridad (SRI), enlaces target="_blank" con rel="noopener", sin tipografías de terceros y tipografías propias presentes.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
let failures = 0, checks = 0;
const ok = msg => { checks++; console.log(`  ✓ ${msg}`); };
const fail = msg => { checks++; failures++; console.log(`  ✗ ${msg}`); };
const expect = (cond, msg) => (cond ? ok(msg) : fail(msg));
const section = t => console.log(`\n${t}`);

/* ---------- Páginas ---------- */
const PAGES = ['index.html', ...readdirSync(ROOT).filter(d => !d.startsWith('.') && existsSync(join(ROOT, d, 'index.html')) && statSync(join(ROOT, d)).isDirectory()).map(d => `${d}/index.html`)];
const html = Object.fromEntries(PAGES.map(p => [p, read(p)]));
const idsOf = src => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

section('1. Estructura de cada página');
for (const p of PAGES) {
  const s = html[p], depth = p.split('/').length - 1, rootExpected = depth ? '../'.repeat(depth) : './';
  const problems = [];
  if (!/<html lang="es">/.test(s)) problems.push('sin lang="es"');
  if (!/<title>[^<]+<\/title>/.test(s)) problems.push('sin <title>');
  if (!/<meta name="description" content="[^"]{50,}">/.test(s)) problems.push('descripción ausente o corta');
  if (!/<link rel="canonical" href="https:\/\/bendi\.dev\/radio\/[^"]*">/.test(s)) problems.push('sin canónica');
  if ((s.match(/<h1[\s>]/g) || []).length !== 1) problems.push('no tiene exactamente un <h1>');
  const rootMeta = (s.match(/<meta name="radio-root" content="([^"]+)">/) || [])[1];
  if (rootMeta !== rootExpected) problems.push(`radio-root "${rootMeta}" (debería ser "${rootExpected}")`);
  if (!/<body data-page="[a-z]+">/.test(s)) problems.push('sin data-page en <body>');
  if (!/<main id="contenido">/.test(s)) problems.push('sin <main id="contenido">');
  expect(!problems.length, `${p}${problems.length ? ': ' + problems.join(', ') : ''}`);
}

section('2. Cabecera y pie comunes');
const norm = (s, re) => (s.match(re) || [''])[0].replace(/(href|src)="(\.\.\/)+/g, '$1="').replace(/(href|src)="\.\//g, '$1="');
for (const [name, re] of [['cabecera', /<header class="top">[\s\S]*?<\/header>/], ['pie', /<footer>[\s\S]*?<\/footer>/]]) {
  const base = norm(html['index.html'], re);
  const diff = PAGES.filter(p => norm(html[p], re) !== base);
  expect(base && !diff.length, `${name} idéntica en las ${PAGES.length} páginas${diff.length ? ' (distinta en: ' + diff.join(', ') + ')' : ''}`);
}

section('3. Enlaces y recursos locales');
for (const p of PAGES) {
  const dir = dirname(p), broken = [];
  for (const [, attr, url] of html[p].matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:|tel:)/.test(url)) continue;
    const [path, anchor] = url.split('#');
    let target = path ? join(dir, path) : p;
    if (path && (path.endsWith('/') || path === '.' || path === './')) target = join(dir, path, 'index.html');
    target = relative('.', target).replace(/\\/g, '/') || 'index.html';
    if (!existsSync(join(ROOT, target))) { broken.push(`${url} (no existe ${target})`); continue; }
    if (anchor && target.endsWith('.html')) {
      const ids = idsOf(html[target] ?? read(target));
      if (!ids.has(anchor)) broken.push(`${url} (no hay #${anchor} en ${target})`);
    }
  }
  expect(!broken.length, `${p}: enlaces locales${broken.length ? ' rotos → ' + broken.join('; ') : ' correctos'}`);
}

section('4. Scripts');
const used = new Set();
for (const p of PAGES) {
  const local = [...html[p].matchAll(/<script src="(?:\.\.\/|\.\/)?js\/([^"]+)"/g)].map(m => m[1]);
  local.forEach(f => used.add(f));
  expect(local[0] === 'core.js' && local.at(-1) === 'glossary.js', `${p}: core.js primero y glossary.js último`);
}
const unused = readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js') && !used.has(f));
expect(!unused.length, `todo archivo de js/ se usa en alguna página${unused.length ? ' (sin usar: ' + unused.join(', ') + ')' : ''}`);

section('5. Sintaxis de JavaScript');
const jsFiles = readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`).concat('tools/check.mjs');
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); ok(f); }
  catch (e) { fail(`${f}: ${String(e.stderr || e.message).split('\n').slice(0, 3).join(' ')}`); }
}

section('6. Datos');
const sandbox = {};
vm.createContext(sandbox);
for (const f of ['js/data.js', 'js/exam-data.js', 'js/clubs-data.js']) vm.runInContext(read(f) + '\n;globalThis.__=Object.assign(globalThis.__||{}, {BANDS:typeof BANDS!=="undefined"?BANDS:undefined, LISTEN:typeof LISTEN!=="undefined"?LISTEN:undefined, EXAM:typeof EXAM!=="undefined"?EXAM:undefined, URE_SECTIONS:typeof URE_SECTIONS!=="undefined"?URE_SECTIONS:undefined});', sandbox, { filename: f });
const D = sandbox.__;
{
  const E = D.EXAM, ids = new Set(E.map(q => q.id));
  expect(ids.size === E.length, `examen: ${E.length} preguntas con id único`);
  const bad = E.filter(q => ![1, 2].includes(q.p) || !q.t || !q.q || !Array.isArray(q.a) || q.a.length < 3 || !(q.ok >= 0 && q.ok < q.a.length) || !q.why || new Set(q.a).size !== q.a.length);
  expect(!bad.length, `examen: todas tienen parte, tema, ≥3 opciones distintas, respuesta válida y explicación${bad.length ? ' (fallan: ' + bad.map(q => q.id).join(', ') + ')' : ''}`);
  for (const p of [1, 2]) { const n = E.filter(q => q.p === p).length; expect(n >= 30, `examen: parte ${p} tiene ${n} preguntas (el simulacro necesita 30)`); }
}
{
  const U = D.URE_SECTIONS;
  const bad = U.filter(r => r.length !== 4 || !r[0] || !r[1] || (r[2] && !/^E[A-H]\d[A-Z0-9]{1,4}$/.test(r[2])) || (r[3] && !/^https?:\/\//.test(r[3])));
  expect(U.length > 100 && !bad.length, `radioclubes: ${U.length} secciones con formato válido${bad.length ? ' (fallan: ' + bad.map(r => r[1]).join(', ') + ')' : ''}`);
  const personal = U.filter(r => r.join(' ').match(/@|\b\d{9}\b|Presidente/i));
  expect(!personal.length, 'radioclubes: ningún dato personal (correos, teléfonos, nombres de cargos)');
}
{
  const sorted = D.BANDS.every((b, i, a) => b.from < b.to && (!i || a[i - 1].from < b.from));
  expect(sorted, 'bandas: rangos válidos y ordenados');
  const badTune = D.LISTEN.filter(l => !/^\d+(lsb|usb|cw|am)$/.test(l.tune));
  expect(!badTune.length, 'escucha guiada: sintonías con formato <kHz><modo>');
}

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

section('8. sitemap.xml');
{
  const sm = read('sitemap.xml');
  const missing = PAGES.map(p => 'https://bendi.dev/radio/' + p.replace('index.html', '')).filter(u => !sm.includes(`<loc>${u}</loc>`));
  expect(!missing.length, `incluye las ${PAGES.length} páginas${missing.length ? ' (faltan: ' + missing.join(', ') + ')' : ''}`);
}

section('9. Instalable y sin conexión');
{
  let man = null;
  try { man = JSON.parse(read('manifest.webmanifest')); } catch (e) { /* inválido */ }
  expect(man && man.name && man.start_url && man.icons && man.icons.length >= 2, 'manifest.webmanifest es JSON válido con nombre, inicio e iconos');
  const icons = man ? man.icons.map(i => i.src).filter(src => !existsSync(join(ROOT, src))) : ['?'];
  expect(!icons.length, `iconos del manifest existen${icons.length ? ' (faltan: ' + icons.join(', ') + ')' : ''}`);
  expect(PAGES.every(p => /rel="manifest"/.test(html[p])), 'todas las páginas enlazan el manifest');
  const sw = read('sw.js');
  const pre = [...sw.matchAll(/'(\.\/[^']*)'/g)].map(m => m[1]);
  const missingFiles = pre.filter(f => !existsSync(join(ROOT, f.endsWith('/') ? f + 'index.html' : f)));
  expect(!missingFiles.length, `sw.js: todo lo de PRECACHE existe${missingFiles.length ? ' (faltan: ' + missingFiles.join(', ') + ')' : ''}`);
  const pagesOut = PAGES.map(p => './' + p.replace('index.html', '')).filter(p => !pre.includes(p));
  const jsOut = readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `./js/${f}`).filter(f => !pre.includes(f));
  expect(!pagesOut.length && !jsOut.length, `sw.js guarda las ${PAGES.length} páginas y todos los módulos${pagesOut.length || jsOut.length ? ' (faltan: ' + [...pagesOut, ...jsOut].join(', ') + ')' : ''}`);
  const v = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
  const last = (read('CHANGELOG.md').match(/^## \[([^\]]+)\]/m) || [])[1];
  expect(v && v === last, `VERSION de sw.js (${v}) = última versión del CHANGELOG (${last})`);
}

section('10. Métricas');
{
  const bad = [];
  for (const f of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js'))) {
    for (const m of read(`js/${f}`).matchAll(/Radio\.track\(([^;]*?)\);/g)) {
      const arg = m[1];
      // Solo literales o plantillas con variables internas conocidas (escenario, id de lección, nivel, semana, apto).
      if (!/^['`][a-z0-9\/\-]*(\$\{(scenario|current\.id|st\.level|wi \+ 1|pass \? 'apto' : 'no-apto')\}[a-z0-9\/\-]*)*['`]$/.test(arg)) bad.push(`${f}: ${arg}`);
    }
  }
  expect(!bad.length, `hitos con nombres fijos${bad.length ? ' (revisar: ' + bad.join(' | ') + ')' : ''}`);
}

section('11. Seguridad y recursos externos');
{
  const csp = p => (html[p].match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1];
  const base = csp('index.html');
  expect(base && PAGES.every(p => csp(p) === base), 'misma Content-Security-Policy en todas las páginas');
  const unpinned = PAGES.flatMap(p => [...html[p].matchAll(/<(?:script|link)[^>]+(?:src|href)="(https:\/\/cdnjs[^"]+)"/g)].map(m => m[1]))
    .filter(u => !/\/\d+\.\d+\.\d+\//.test(u));
  expect(!unpinned.length, `librerías de cdnjs con versión fija${unpinned.length ? ' (sin versión: ' + unpinned.join(', ') + ')' : ''}`);
  const noSri = PAGES.flatMap(p => [...html[p].matchAll(/<(?:script|link)[^>]+(?:src|href)="https:\/\/cdnjs[^>]+>/g)].map(m => m[0]))
    .filter(t => !/integrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/.test(t) || !/crossorigin="anonymous"/.test(t));
  expect(!noSri.length, `librerías de cdnjs con integridad (SRI) y crossorigin${noSri.length ? ' (faltan: ' + noSri.length + ')' : ''}`);
  const blank = [];
  for (const f of [...PAGES, ...readdirSync(join(ROOT, 'js')).map(f => `js/${f}`)]) {
    for (const m of read(f).matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) blank.push(`${f}: ${m[0].slice(0, 60)}`);
  }
  expect(!blank.length, `enlaces que abren pestaña nueva con rel="noopener"${blank.length ? ' (faltan: ' + blank.slice(0, 5).join(' | ') + ')' : ''}`);
  expect(PAGES.every(p => !/fonts\.googleapis|fonts\.gstatic/.test(html[p])), 'sin tipografías de terceros (todas en fonts/)');
  const faces = [...read('css/style.css').matchAll(/url\('\.\.\/(fonts\/[^']+)'\)/g)].map(m => m[1]);
  const missing = faces.filter(f => !existsSync(join(ROOT, f)));
  expect(faces.length >= 3 && !missing.length, `tipografías de @font-face presentes${missing.length ? ' (faltan: ' + missing.join(', ') + ')' : ''}`);
}

console.log(`\n${failures ? '✗' : '✓'} ${checks - failures} de ${checks} comprobaciones correctas${failures ? `, ${failures} fallan` : ''}.`);
process.exit(failures ? 1 : 0);
