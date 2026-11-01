# Estilos y diseño

El sistema visual de la web: colores, tipografías, medidas, componentes y cómo cambiarlos. Todo está en una sola hoja, [`css/style.css`](../css/style.css), que empieza con un índice de sus secciones.

## Principios

1. **Neutro y cálido a la vez.** Fondo grafito (no negro puro), un acento menta para lo que se pulsa y un amarillo cálido para lo destacado. La radio "de noche", sin parecer una web de hackers.
2. **Legible primero.** Texto a 17 px, interlineado 1,6, líneas de 34 em como máximo en las entradillas. Todos los colores de texto pasan **WCAG AA** con holgura (ver la tabla de contraste).
3. **Lo técnico en monoespaciada.** Frecuencias, horas UTC, indicativos y etiquetas pequeñas usan IBM Plex Mono, como en un equipo de radio.
4. **Una sola hoja, sin preprocesadores.** Variables CSS (`--nombre`) para todo lo que se repite.

## Colores

Definidos en `:root` al principio de `style.css`.

| Variable | Valor | Para qué | Contraste sobre `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#111214` | Fondo de la página | — |
| `--bg2` | `#17181b` | Fondo de campos, chips y bloques secundarios | — |
| `--panel` | `#1b1c20` | Fondo de tarjetas (`.card`) | — |
| `--line` | `#2c2e34` | Bordes y separadores | (decorativo) |
| `--ink` | `#f2f2f4` | Texto principal | **16,8 : 1** |
| `--muted` | `#9c9ea6` | Texto secundario, notas | **7,0 : 1** |
| `--accent` | `#8be0c2` | Botones, enlaces, lo seleccionado | **12,1 : 1** |
| `--accent-soft` | `#8be0c21f` | Fondo suave de lo seleccionado (menta al 12 %) | — |
| `--hot` | `#ffd27a` | Destacado: reloj UTC, aciertos, avisos | **13,2 : 1** |
| `--red` | `#ff6b5a` | Errores, aguja del dial | **6,7 : 1** |
| `--vhf` | `#6cc5ff` | Bandas de VHF/UHF en gráficos | **9,9 : 1** |

Texto oscuro sobre botón menta (`#0f1714` sobre `--accent`): **11,7 : 1**. Sobre `--panel` el peor caso es `--red` con 6,1 : 1. WCAG AA pide 4,5 : 1 para texto normal y 3 : 1 para texto grande.

**Para cambiar la paleta:** cambia los valores de `:root`. Algunos tonos derivados están escritos a mano con transparencia (por ejemplo `#8be0c244` en la sombra de `.btn:hover` o `#8be0c226` en `.opt.right`): búscalos con `grep -n "8be0c2" css/style.css`. Después comprueba el contraste en <https://webaim.org/resources/contrastchecker/> y actualiza `theme-color` en las páginas y en `manifest.webmanifest`.

## Tipografías

| Uso | Familia | Archivo | Pesos | Tamaño |
| --- | --- | --- | --- | --- |
| Títulos (`h1`, `h2`), marca, cifras grandes | **Fraunces** (serif variable) | `fonts/fraunces.woff2` | 600–800 | 70 KB |
| Texto, botones, formularios | **IBM Plex Sans** (variable) | `fonts/ibm-plex-sans.woff2` | 400–600 | 38 KB |
| Frecuencias, UTC, etiquetas | **IBM Plex Mono** | `fonts/ibm-plex-mono-400.woff2`, `-600.woff2` | 400, 600 | 16 + 18 KB |

- Variables: `--serif`, `--sans`, `--mono`, cada una con su alternativa del sistema (`Georgia`, `system-ui`, `ui-monospace`).
- `font-display: swap`: el texto aparece al momento con la fuente del sistema y cambia cuando llega la propia. La de texto se **precarga** en el `<head>` de cada página.
- **Recorte:** solo latín, latín extendido (ñ, á, ç, ł…), puntuación, flechas y unos pocos símbolos (Ω, ≈, €, λ, π). Un carácter fuera del recorte se verá con la fuente del sistema.
- **Licencia:** SIL Open Font License; los textos están en `fonts/OFL-*.txt`. Permite alojarlas y modificarlas.

### Regenerar o cambiar las tipografías

El proceso exacto está en [`tools/fuentes.py`](../tools/fuentes.py) (instrucciones en su cabecera):

1. Instala `fonttools` y `brotli` y descarga los originales de `github.com/google/fonts` (solo las carpetas necesarias).
2. Edita `UNICODES` (caracteres) o `FONTS` (archivos y ejes) si hace falta.
3. `python3 tools/fuentes.py /ruta/a/google-fonts` → escribe `fonts/*.woff2`.
4. Si cambian los nombres, actualiza los `@font-face` de `style.css`, el `preload` de las seis páginas y `PRECACHE` en `sw.js`.
5. Sube `VERSION` en `sw.js`.

## Medidas

| Qué | Valor |
| --- | --- |
| Ancho máximo del contenido | `main`: 1160 px centrado, con 24 px de margen lateral |
| Margen lateral en móvil | 16 px (≤ 860 px) |
| Radio de esquinas | `--radius` = 14 px (tarjetas, tablas); 999 px (botones y chips, forma de píldora) |
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
| `.btn` | Botón principal (menta, texto oscuro) | `.ghost` (contorno), `.small`, `:disabled` |
| `.card` | Tarjeta con fondo `--panel` y borde | `.link` (toda la tarjeta es un enlace) |
| `.chip` | Filtro o etiqueta pequeña con forma de píldora | `.on` / `[aria-pressed="true"]` |
| `.opt` | Opción de respuesta (examen, lecciones, contactos) | `.wide`, `.right` (acierto), `.wrong` (fallo), `.picked` |
| `.kicker` | Antetítulo en mayúsculas y monoespaciada | — |
| `.section-head` | Bloque de título + entradilla de cada sección | — |
| `.page-head` | Cabecera de página interior con `h1`, entradilla e índice | — |
| `.next-page` | Enlace "Siguiente: …" al final de cada página | — |
| `.note` | Texto pequeño y gris | `.bad` (en rojo) |
| `.table-wrap` | Contenedor de tabla con desplazamiento horizontal y foco | — |
| `.toast` | Aviso flotante temporal (insignias) | `.show` |
| `.sr-only` | Oculto a la vista pero leído por lectores de pantalla | — |

**Estados:** lo seleccionado se marca con la clase `.on` **y** con el atributo ARIA correspondiente (`aria-pressed`, `aria-expanded`, `aria-current`), para que lo note también quien usa lector de pantalla. `[hidden]` lleva `display: none !important` para que ninguna otra regla lo anule.

## Iconos e imágenes

- **Emojis** como iconos: no pesan, se ven en todos los sistemas y se entienden. Siempre acompañados de texto.
- **Icono de la web** (`img/`): generado a partir del dial (onda menta y aguja sobre grafito) en 64, 180, 192 y 512 px, más una versión *maskable* con margen de seguridad para Android.
- **`og.png`** (1200 × 630): imagen al compartir en redes.
- Capturas para la documentación: `docs/img/`.

## Cómo añadir estilos nuevos

1. Busca primero si ya existe un componente (tabla de arriba).
2. Si es de una sección nueva, añade un bloque al final de `style.css` con su comentario `/* ---------- Nombre ---------- */` y apúntalo en el índice del principio.
3. Usa las variables de color y tipografía; nunca colores sueltos salvo transparencias del acento.
4. Prueba a 390 px y a 1280 px, con teclado (el foco debe verse) y con "reducir movimiento".
5. Sube `VERSION` en `sw.js` al publicar.
