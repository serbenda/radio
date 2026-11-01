#!/usr/bin/env node
/**
 * tools/enlaces.mjs · Comprueba que los enlaces EXTERNOS de la web siguen vivos.
 *
 * Uso:   node tools/enlaces.mjs            (informe en pantalla; sale con 1 si hay enlaces rotos)
 *        node tools/enlaces.mjs --md       (informe en Markdown, para abrir un aviso en GitHub)
 *        node tools/enlaces.mjs --lista    (solo lista las URL que revisaría, sin conectarse)
 *
 * Lo ejecuta cada lunes .github/workflows/enlaces.yml, que abre o actualiza un aviso con la
 * etiqueta "enlaces" si algo falla. No va en tools/check.mjs porque depende de internet y de
 * servidores ajenos: un servidor caído un rato no debe bloquear una pull request.
 *
 * Qué revisa: todas las URL http(s) que aparecen en las páginas HTML y en js/, salvo las de
 * servicios en directo (APIs) y las de plantilla (con ${...}), que tienen su propio mensaje de error en la web.
 * Cómo decide: pide la página (HEAD y, si el servidor no lo admite, GET) con 20 s de límite y hasta
 * 3 intentos. Cuenta como roto: 404, 410, error de DNS o de conexión. Un 403 o 429 cuenta como
 * "dudoso" (muchos servidores bloquean robots) y no hace fallar el informe.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MD = process.argv.includes('--md');
// Servicios que la web consulta en directo (no son enlaces para la persona) o raíces sin página.
const SKIP = [/api\.radio-browser\.info/, /hamqth\.com\/api/, /celestrak\.org\/NORAD/, /goatcounter\.com/, /gc\.zgo\.at/,
  /arcgisonline\.com/, /prop\.kc2g\.com\/renders/, /cdnjs\.cloudflare\.com/, /upload\.wikimedia\.org/, /\$\{/, /bendi\.dev\/radio/,
  /github\.com\/serbenda\/radio\/issues\/new/];

function files(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (f.startsWith('.') || ['docs', 'tools', 'node_modules', 'fonts', 'img'].includes(f)) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(html|js)$/.test(f) ? [p] : [];
  });
}

const found = new Map(); // url -> [archivos]
for (const f of files(ROOT)) {
  for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'`<>)\]]+/g)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (SKIP.some(re => re.test(url))) continue;
    const list = found.get(url) || [];
    const rel = relative(ROOT, f);
    if (!list.includes(rel)) list.push(rel);
    found.set(url, list);
  }
}

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
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return { code: 0, err: last };
}

const urls = [...found.keys()].sort();
if (process.argv.includes('--lista')) { for (const u of urls) console.log(u); console.log(`\n${urls.length} enlaces.`); process.exit(0); }
const broken = [], doubtful = [];
const queue = [...urls];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const r = await probe(url);
    if (r.code === 0 || r.code === 404 || r.code === 410 || r.code >= 500) broken.push({ url, ...r });
    else if (r.code === 403 || r.code === 429 || r.code === 401) doubtful.push({ url, ...r });
  }
}));

const line = x => `${x.code || x.err} · ${x.url} · en ${found.get(x.url).join(', ')}`;
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
process.exit(broken.length ? 1 : 0);
