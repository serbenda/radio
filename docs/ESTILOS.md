# Estilos y diseño

El sistema visual de la web: colores, tipografías, medidas, componentes y cómo cambiarlos. Todo está en una sola hoja, [`css/style.css`](../css/style.css), que empieza con un índice de sus secciones.

## Identidad: "Dial nocturno"

La web se ve como **un receptor de válvulas encendido de noche**: el frontal azul medianoche, el cristal del dial iluminado en ámbar por detrás y la aguja roja. No es un tema oscuro genérico: cada recurso visual sale de un equipo de radio.

| Recurso | De dónde sale | Dónde se ve |
| --- | --- | --- |
| Azul medianoche, no negro | La chapa pintada de los equipos y la noche, cuando mejor se oye la onda corta | Fondo y paneles |
| Ámbar | La bombilla que ilumina el dial | Botones, enlaces, escalas, cifras |
| Aguja roja | La aguja del dial | Página actual del menú, dial de la portada, escala bajo cada título |
| Escala con marcas | La escala de frecuencias | Menú (las páginas están "sintonizadas" sobre una escala), bajo el título de cada página (la aguja avanza de Escuchar a Empezar), dial |
| Titulares condensados en mayúsculas | Los rótulos grabados en los frontales | Portada y títulos de página |
| Barras de segmentos | El medidor S (fuerza de señal) | Progreso de "Tu primer mes" y termómetro del examen |
| Cascada azul → ámbar → blanco | La cascada de un receptor SDR | "¿Qué es este sonido?" |
| Teclas | Los pulsadores de un equipo | Botones con esquina de 6 px y borde inferior que se hunde al pulsar |

**Lo memorable es el dial**; todo lo demás es sobrio: paneles planos sin sombras, una sola luz cálida arriba de la página, sin degradados decorativos.

## Principios

1. **El dial manda.** La escala y la aguja son la firma; no se añaden adornos que no salgan de un equipo de radio.
2. **Legible primero.** Texto en Atkinson Hyperlegible (diseñada para baja visión) a 17 px con interlineado 1,6, y líneas de menos de 80 caracteres. Todos los colores de texto pasan **WCAG AA** con holgura.
3. **Lo técnico en monoespaciada.** Frecuencias, horas UTC e indicativos en IBM Plex Mono, como en una pantalla de equipo.
4. **Antetítulos en frase normal.** Nada de etiquetas en mayúsculas espaciadas: el antetítulo va en ámbar, con una marca de escala delante.
5. **Una sola hoja, sin preprocesadores.** Variables CSS (`--nombre`) para todo lo que se repite.

## Colores

Definidos en `:root` al principio de `style.css`.

| Variable | Valor | Para qué | Contraste sobre `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#0f1b2d` | Fondo de la página (azul medianoche) | — |
| `--bg2` | `#13233a` | Campos, chips, cristal del dial, barras vacías | — |
| `--panel` | `#172a44` | Paneles y tarjetas (`.card`) | — |
| `--line` | `#27405f` | Bordes y separadores | (decorativo) |
| `--ink` | `#eaf0f7` | Texto principal | **15,1 : 1** |
| `--muted` | `#9db0c7` | Texto secundario, notas | **7,8 : 1** |
| `--accent` | `#f2b33d` | Ámbar: botones, enlaces, escalas, lo seleccionado | **9,3 : 1** |
| `--accent-soft` | `#f2b33d1f` | Fondo de lo seleccionado (ámbar al 12 %) | — |
| `--hot` | `#ffe2a0` | Luz pálida: reloj UTC, cifras destacadas | **13,7 : 1** |
| `--red` | `#ff5a4e` | Aguja, página actual, errores, NO APTO | **5,6 : 1** |
| `--vhf` | `#7cc7ff` | Bandas de VHF/UHF | **9,4 : 1** |
| (sin variable) | `#c9a7ff` y `#6fdc9a` | Solo en el mapa del espectro: radiodifusión (lavanda) y aviones y barcos (verde). Contraste 8,6 : 1 y 10,2 : 1 | — |
| (sin variable) | `#ea4aaa` | Rosa de marca de GitHub Sponsors, solo en "Apoya el proyecto". El botón lleva texto oscuro `#1d0a16` (5,3 : 1) | — |

Texto oscuro sobre botón ámbar (`#1a1206` sobre `--accent`): **10 : 1**. Sobre `--panel` el peor caso es `--red` con 4,7 : 1. WCAG AA pide 4,5 : 1 para texto normal.

**Para cambiar la paleta:** cambia los valores de `:root`. Algunos tonos derivados están escritos a mano con transparencia (por ejemplo `#f2b33d55` en las escalas): búscalos con `grep -n "f2b33d" css/style.css js/*.js`. Los mapas y la tarjeta QSL usan los colores directamente en `stations.js`, `iss.js`, `live.js` y `qso.js`, y la cascada en `color()` de `sounds.js`. Después comprueba el contraste en <https://webaim.org/resources/contrastchecker/> y actualiza `theme-color` en las páginas, `404.html`, `offline.html` y `manifest.webmanifest`.

## Tipografías

| Uso | Familia | Archivos | Pesos | Tamaño |
| --- | --- | --- | --- | --- |
| Titulares, menú, botones, cifras grandes | **Barlow Condensed**: condensada, como los rótulos grabados de los equipos | `fonts/barlow-condensed-600/700/800.woff2` | 600, 700, 800 | 3 × 24 KB |
| Texto y formularios | **Atkinson Hyperlegible**: diseñada por el Braille Institute para que las letras no se confundan | `fonts/atkinson-400.woff2`, `-400-italic`, `-700` | 400, 700 | 19 + 21 + 20 KB |
| Frecuencias, UTC, indicativos | **IBM Plex Mono** | `fonts/ibm-plex-mono-400.woff2`, `-600.woff2` | 400, 600 | 16 + 18 KB |

- Variables: `--display`, `--sans`, `--mono`, cada una con su alternativa del sistema (`Arial Narrow`, `system-ui`, `ui-monospace`).
- `font-display: swap`: el texto aparece al momento con la fuente del sistema y cambia cuando llega la propia. La de texto se **precarga** en el `<head>` de cada página.
- **Recorte:** solo latín, latín extendido (ñ, á, ç, ł…), puntuación, flechas y unos pocos símbolos (Ω, ≈, €, λ, π). Un carácter fuera del recorte se verá con la fuente del sistema.
- **Licencia:** SIL Open Font License; los textos están en `fonts/OFL-*.txt`. Permite alojarlas y modificarlas.

### Regenerar o cambiar las tipografías

El proceso exacto está en [`tools/fuentes.py`](../tools/fuentes.py) (instrucciones en su cabecera):

1. Instala `fonttools` y `brotli` y descarga los originales de `github.com/google/fonts` (solo las carpetas necesarias).
2. Edita `UNICODES` (caracteres) o `FONTS` (archivos y ejes) si hace falta.
3. `python3 tools/fuentes.py /ruta/a/google-fonts` → escribe `fonts/*.woff2`.
4. Si cambian los nombres, actualiza los `@font-face` de `style.css`, el `preload` de todas las páginas y `PRECACHE` en `sw.js`.
5. Sube `VERSION` en `sw.js`.

## Medidas

| Qué | Valor |
| --- | --- |
| Ancho máximo del contenido | `main`: 1160 px centrado, con 24 px de margen lateral |
| Margen lateral en móvil | 16 px (≤ 860 px) |
| Radio de esquinas | `--radius` = 10 px (tarjetas, tablas, mapas); 6 px (botones y chips, como teclas); 999 px solo en el selector de nivel de las lecciones, el sello de apoyo y los avisos flotantes |
| Separación entre secciones | `section`: 72 px arriba en ordenador, 56 px en móvil |
| Tamaño mínimo de lo pulsable | 24 × 24 px (WCAG 2.2); los botones normales miden ≥ 40 px de alto |

## Puntos de corte (`@media`)

| Ancho | Qué cambia |
| --- | --- |
| ≤ 960 px | "Tu primer mes" pasa de 4 a 2 columnas |
| ≤ 860 px | Portada, escucha guiada, lecciones y radioclubes pasan a una columna; el mapa de clubes se acorta |
| ≤ 700 px | Mapa de emisoras y lista se apilan |
| ≤ 600 px | Termómetro del examen en dos filas |
| ≤ 560 px | "Tu primer mes" a una columna |
| ≤ 480 px | Ajustes finos de la portada y la escala del dial |
| `prefers-reduced-motion` | Sin animaciones del dial ni del fondo |

Se diseña para **390 px** de ancho (móvil típico) y se comprueba también a 1280 px. `html, body { overflow-x: clip }` impide que algo demasiado ancho provoque desplazamiento horizontal en el móvil.

## Capas (`z-index`)

| Valor | Elemento |
| --- | --- |
| −1 | Halo decorativo detrás del receptor de la portada |
| 900 | Reproductor de emisoras (`.player`), pegado abajo mientras suena |
| 1000 | Cabecera fija (`.top`) |
| 2000 | Bocadillo del glosario (`.term-tip`) y enlace "Saltar al contenido" |
| 3000 | Avisos flotantes (`.toast`), por encima de todo |

## Componentes

| Clase | Qué es | Variantes |
| --- | --- | --- |
| `.btn` | Tecla principal (ámbar, texto oscuro, esquina de 6 px, se hunde al pulsar) | `.ghost` (contorno), `.small`, `:disabled` |
| `.card` | Tarjeta con fondo `--panel` y borde | `.link` (toda la tarjeta es un enlace) |
| `.chip` | Filtro o etiqueta pequeña, en Barlow Condensed y con esquina de 6 px | `.on` / `[aria-pressed="true"]` |
| `.opt` | Opción de respuesta (examen, lecciones, contactos) | `.wide`, `.right` (acierto), `.wrong` (fallo), `.picked` |
| `.kicker` | Antetítulo en frase normal, en ámbar, con una marca de escala delante | — |
| `.section-head` | Bloque de título + entradilla de cada sección | — |
| `.page-head` | Cabecera de página interior con `h1`, entradilla e índice | — |
| `.next-page` | Enlace "Siguiente: …" al final de cada página | — |
| `.note` | Texto pequeño y gris | `.bad` (en rojo) |
| `.table-wrap` | Contenedor de tabla con desplazamiento horizontal y foco | — |
| `.toast` | Aviso flotante temporal (insignias) | `.show` |
| `.sr-only` | Oculto a la vista pero leído por lectores de pantalla | — |
| `.spec-row`, `.spec-band` | Mapa del espectro (Espectro): una fila por categoría y franjas como botones | `.cat-dif`, `.cat-ham`, `.cat-free`, `.cat-pro`, `.cat-trans`, `.cat-sky`, `.cat-tel` (fijan `--c`) |
| `.ant`, `.ant-pics`, `.ant-facts` | Tarjeta de antena con dibujo y diagrama de radiación, y ficha | `[hidden]` al filtrar |
| `.countries.wrap` | Tabla con textos largos que sí salta de línea | — |

**Estados:** lo seleccionado se marca con la clase `.on` **y** con el atributo ARIA correspondiente (`aria-pressed`, `aria-expanded`, `aria-current`), para que lo note también quien usa lector de pantalla. `[hidden]` lleva `display: none !important` para que ninguna otra regla lo anule.

## Iconos e imágenes

- **Emojis** como iconos: no pesan, se ven en todos los sistemas y se entienden. Siempre acompañados de texto.
- **Icono de la web** (`img/`): el dial (escala y onda ámbar, aguja roja, sobre azul medianoche) en 64, 180, 192 y 512 px, más una versión *maskable* con margen de seguridad para Android.
- **`og.png`** (1200 × 630): imagen al compartir en redes.
- Capturas para la documentación: `docs/img/`.

## Cómo añadir estilos nuevos

1. Busca primero si ya existe un componente (tabla de arriba).
2. Si es de una sección nueva, añade un bloque al final de `style.css` con su comentario `/* ---------- Nombre ---------- */` y apúntalo en el índice del principio.
3. Usa las variables de color y tipografía; nunca colores sueltos salvo transparencias del acento.
4. Prueba a 390 px y a 1280 px, con teclado (el foco debe verse) y con "reducir movimiento".
5. Sube `VERSION` en `sw.js` al publicar.
