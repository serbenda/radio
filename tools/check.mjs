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

console.log(`\n${failures ? '✗' : '✓'} ${checks - failures} de ${checks} comprobaciones correctas${failures ? `, ${failures} fallan` : ''}.`);
process.exit(failures ? 1 : 0);
