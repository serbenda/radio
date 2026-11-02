# Pruebas

## Comprobaciones automáticas

```bash
node tools/check.mjs
```

No necesita instalar nada (Node 18 o superior). Se ejecuta también en GitHub Actions en cada pull request y en cada push a `development` y `main` ([`.github/workflows/comprobaciones.yml`](../.github/workflows/comprobaciones.yml)). Si algo falla, la PR aparece en rojo.

| # | Comprobación | Qué detecta |
| --- | --- | --- |
| 1 | Estructura de cada página | Falta `lang`, título, descripción (≥ 50 caracteres), canónica, `data-page`, `<main id="contenido">`; más o menos de un `<h1>`; `radio-root` que no cuadra con la profundidad |
| 2 | Cabecera y pie comunes | Una página con el menú o el pie distinto de las demás |
| 3 | Enlaces y recursos locales | `href`/`src` locales que no existen, y anclajes `#id` que no están en la página de destino |
| 4 | Scripts | `core.js` que no va el primero, `glossary.js` que no va el último, archivos de `js/` que no usa ninguna página |
| 5 | Sintaxis | Errores de sintaxis en cualquier `.js` (`node --check`) |
| 6 | Datos | Preguntas sin id único, sin explicación, con respuesta fuera de rango u opciones repetidas; menos de 30 por parte; secciones de radioclub mal formadas o con datos personales; bandas desordenadas; sintonías mal escritas |
| 7 | "Tu primer mes" | Pasos que enlazan a páginas o secciones que no existen |
| 8 | sitemap.xml | Páginas que faltan |
| 9 | Instalable y sin conexión | Manifest inválido o con iconos que no existen, páginas sin `rel="manifest"`, archivos de `sw.js` que no existen, páginas o módulos que `sw.js` no guarda, `VERSION` distinta de la última del CHANGELOG |
| 10 | Métricas | `Radio.track()` con un nombre que no sea fijo (podría acabar enviando algo que escribe la persona) |
| 11 | Seguridad | Content-Security-Policy distinta entre páginas, librerías de cdnjs sin versión fija o sin `integrity`, `target="_blank"` sin `rel="noopener"`, tipografías de terceros o archivos de `@font-face` que no existen |

Prueba de que funciona: si se rompe a propósito un enlace del menú y un paso de la ruta, el script marca 3 fallos y sale con código 1.

## Otras herramientas

| Herramienta | Para qué | Cuándo |
| --- | --- | --- |
| `node tools/enlaces.mjs` | Revisa los ≈ 110 enlaces externos (404, caídas). `--lista` solo los enumera; `--md` da el informe en Markdown | Lo ejecuta cada lunes `.github/workflows/enlaces.yml`, que abre un aviso con la etiqueta `enlaces` si hay rotos. Se puede lanzar a mano en Actions → Enlaces externos → Run workflow |
| `tools/solo-comentarios.sh [ref]` | Confirma que un cambio solo toca comentarios y líneas en blanco | Al revisar documentación del código |
| `python3 tools/fuentes.py` | Regenera las tipografías | Solo si cambian ([ESTILOS.md](ESTILOS.md#tipografías)) |

## Auditoría de accesibilidad

Con [axe-core](https://github.com/dequelabs/axe-core), sin instalar nada: abre la página publicada (o en local), F12 → Consola, y pega:

```js
await new Promise(r => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'; s.onload = r; document.head.append(s); });
(await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] }))
  .violations.map(v => `${v.impact} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`);
```

> Funciona también con la Content-Security-Policy porque cdnjs está permitido. Otra opción es la extensión [axe DevTools](https://www.deque.com/axe/devtools/) del navegador.

Desplázate hasta el final antes de ejecutarlo (los mapas y datos se cargan al acercarse) y repite con los estados interactivos abiertos (una tarjeta del examen respondida, un simulacro, una lección). Resultado esperado: lista vacía. Última auditoría: 1 de noviembre de 2026, sin incidencias tras los arreglos de la versión 2.2.

Además, revisa a mano: recorrer cada página solo con el tabulador (el foco siempre visible), zoom al 200 % sin que se corte nada, y un lector de pantalla (VoiceOver en Mac/iPhone, TalkBack en Android, NVDA en Windows) en la portada y el examen.

## Probar la instalación

- **Chrome de ordenador:** F12 → Aplicación → Manifest: sin errores, con icono y capturas. Aparece el icono de instalar en la barra de direcciones y el botón "Instalar la app" en el pie.
- **Android (Chrome):** abre la web y espera unos segundos: aparece "Instalar la app" en el pie. Al pulsarlo sale la ventana con las capturas. Tras instalar, se abre a pantalla completa y funciona en modo avión.
- **iPhone (Safari):** el botón del pie lleva a la portada con los pasos de iPhone abiertos. Compartir → Añadir a pantalla de inicio. Al abrirla desde el icono, la portada debe decir "Ya la estás usando instalada".
- Automático: `tools/check.mjs` §9 comprueba el manifest, iconos, capturas y que todas las páginas lo enlazan. Última comprobación con Chromium: sin errores de instalabilidad.

## Comprobar la Content-Security-Policy

Abre cada página con la consola abierta, desplázate hasta el final y usa sus funciones (reproducir una emisora, abrir un aviso, calcular pases de la ISS, ver el mapa de clubes). No debe aparecer ningún mensaje **"Refused to … because it violates the following Content Security Policy directive"**. Si aparece, falta un dominio en la CSP ([GUIA.md](GUIA.md#añadir-un-servicio-externo)).

## Probar en local

```bash
python3 -m http.server 8000
```

y abre <http://localhost:8000/>. También funciona abriendo `index.html` directamente, salvo lo que depende de servicios externos si no hay conexión.

### Probar el modo sin conexión

El service worker solo funciona por `http://localhost` o HTTPS, y su alcance es la carpeta donde está. Como la web vive en la raíz de `radio.bendi.dev/`, basta con el mismo servidor de antes (`python3 -m http.server 8000` desde la raíz del repositorio).

Abre <http://localhost:8000/>, recarga una vez, y en las herramientas del navegador (Aplicación → Service workers) marca "Sin conexión": las seis páginas deben abrirse y una dirección inventada debe mostrar "Sin propagación". Tras cambiar archivos, sube `VERSION` en `sw.js` o marca "Update on reload".

## Lista de comprobación manual antes de fusionar

Hacerla en ordenador y en un móvil (o en el modo móvil del navegador, 390 px de ancho).

**Todas las páginas**
- [ ] No hay errores en la consola.
- [ ] No hay desplazamiento horizontal en el móvil.
- [ ] El menú marca la página actual y se puede recorrer con el tabulador.
- [ ] El glosario se abre al pasar el ratón y al tocar.

**Inicio**
- [ ] El dial se mueve y dice la banda; la señal se anima y se para al bajar.
- [ ] "Tu primer mes" muestra el progreso guardado.

**Escuchar**
- [ ] El mapa carga emisoras y suenan al pulsarlas.
- [ ] La escucha guiada abre el receptor ya sintonizado.
- [ ] "Ahora en el aire" pinta líneas y frases; filtrar por banda funciona.
- [ ] Cada sonido suena y se dibuja en la cascada; la cascada se para sola.

**Entender**
- [ ] Las cuatro lecciones dibujan y cambian de nivel; acertar las 3 preguntas marca la lección.
- [ ] La propagación muestra la frase y el semáforo; tocar una banda la explica.
- [ ] La ISS aparece en el mapa con su cuenta atrás y sus pases; cambiar de ciudad los recalcula.

**Practicar**
- [ ] El traductor suena; el entrenador Koch responde con teclado y toque.
- [ ] Los cinco contactos simulados terminan; la QSL se descarga.

**Examen**
- [ ] Las tarjetas explican cada respuesta; el simulacro corrige y da APTO o NO APTO.

**Empezar**
- [ ] El mapa de radioclubes y el selector de provincia funcionan.
- [ ] El calendario muestra los próximos eventos.
- [ ] El autotest da una recomendación con enlaces que funcionan.

## Probar los datos en directo

Los servicios externos responden a peticiones desde `https://bendi.dev`. Para probar una rama sin publicarla, abre `https://radio.bendi.dev/` en el navegador y, desde la consola, puedes cargar el código de la rama con `fetch` a `raw.githubusercontent.com` y ejecutarlo; así se probaron "Ahora en el aire" y la ISS antes de publicarlas.

**Desde la versión 2.2 la CSP impide ejecutar así el código descargado (no permite `eval` ni insertar scripts en línea).** Para probar datos en directo de una rama, publícala en un fork con GitHub Pages o prueba en local: los servicios con CORS abierto (`*`) también responden a `http://localhost`.
