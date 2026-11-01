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

Prueba de que funciona: si se rompe a propósito un enlace del menú y un paso de la ruta, el script marca 3 fallos y sale con código 1.

## Probar en local

```bash
python3 -m http.server 8000
```

y abre <http://localhost:8000/>. También funciona abriendo `index.html` directamente, salvo lo que depende de servicios externos si no hay conexión.

### Probar el modo sin conexión

El service worker solo funciona por `http://localhost` o HTTPS, y su alcance es la carpeta donde está. Para probarlo como en `bendi.dev/radio/`:

```bash
mkdir -p /tmp/srv && ln -sfn "$PWD" /tmp/srv/radio && cd /tmp/srv && python3 -m http.server 8000
```

Abre <http://localhost:8000/radio/>, recarga una vez, y en las herramientas del navegador (Aplicación → Service workers) marca "Sin conexión": las seis páginas deben abrirse y una dirección inventada debe mostrar "Sin propagación". Tras cambiar archivos, sube `VERSION` en `sw.js` o marca "Update on reload".

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

Los servicios externos responden a peticiones desde `https://bendi.dev`. Para probar una rama sin publicarla, abre `https://bendi.dev/radio/` en el navegador y, desde la consola, puedes cargar el código de la rama con `fetch` a `raw.githubusercontent.com` y ejecutarlo; así se probaron "Ahora en el aire" y la ISS antes de publicarlas.
