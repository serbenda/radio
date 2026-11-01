# Calidad: accesibilidad, rendimiento y buenas prácticas

Qué se ha aplicado, por qué, y qué limitaciones conocidas quedan.

## Accesibilidad

**Estructura**
- Un solo `<h1>` por página y títulos en orden (`h1` → `h2` → `h3`). Lo vigila `tools/check.mjs`.
- `<html lang="es">`, `<main id="contenido">` y enlace "Saltar al contenido" como primer elemento enfocable.
- Menú con `aria-label="Principal"` y la página actual marcada con `aria-current="page"`.
- Índice "En esta página" en cada página interior.

**Controles**
- Todo lo que se pulsa es un `<button type="button">` o un enlace, nunca un `<div>` con clic.
- Los botones con estado usan `aria-pressed` (bandas, sonidos, escucha guiada) o `aria-expanded` (semáforo de propagación).
- Foco visible en todos los controles (`:focus-visible`).
- El dial anuncia frecuencia y banda con `aria-valuetext`.
- El entrenador de Morse se maneja con el teclado (la propia letra).
- El glosario emergente se abre con ratón, con el teclado (`tabindex="0"` y foco) o tocando, y se cierra con Esc.

**Gráficos**
- Ningún dato está solo en un gráfico: cada lienzo tiene al lado un texto que dice lo mismo (`.lesson-readout`, ficha del sonido, frase de la propagación, listado de emisoras, avisos en frases, lista de pases, lista de radioclubes).
- Los lienzos decorativos llevan `aria-hidden="true"`; los textos que cambian, `aria-live="polite"`.
- El semáforo de bandas no depende solo del color: cada banda dice "Abierta", "Floja" o "Cerrada".

**Auditoría automática**
- Las seis páginas se revisaron con [axe-core](https://github.com/dequelabs/axe-core) 4.10 (reglas WCAG 2.0, 2.1 y 2.2 A/AA y buenas prácticas), también con el examen abierto y un simulacro en marcha. Se corrigieron: barra de progreso sin `role`, orden de títulos en la portada y en lecciones, región de emisoras, grupo de niveles mal declarado como pestañas, tamaño del objetivo junto a "Siguiente", cabecera vacía de tabla y tablas desplazables sin foco. Cómo repetirla: [PRUEBAS.md](PRUEBAS.md#auditoría-de-accesibilidad).
- Contraste de todos los colores de texto ≥ 6:1 sobre los fondos (tabla en [ESTILOS.md](ESTILOS.md#colores)).
- Las tablas anchas son regiones con nombre y se pueden desplazar con el teclado (`tabindex="0"`).

**Movimiento**
- Con "reducir movimiento" activado en el sistema no se anima nada: los dibujos se pintan una vez.

## Rendimiento

| Práctica | Dónde |
| --- | --- |
| Sin compilación ni frameworks: unos 230 KB de HTML, CSS y JS en total, repartidos entre seis páginas | Todo |
| Cada página carga solo sus módulos y librerías (Leaflet solo con mapas; satellite.js solo en Entender) | Plantilla de cada página |
| Carga perezosa de mapas y datos externos al acercarse la sección | `IntersectionObserver` en cada módulo con mapa o datos |
| Animaciones solo con la sección en pantalla y la pestaña visible | `Radio.whileVisible`: dial, lecciones |
| La cascada se para 1,5 s después del último sonido | `sounds.js` |
| Datos en directo solo mientras se ven y respetando los límites de cada API | `live.js` (60 s), `propagation.js` (15 min) |
| Tipografías propias recortadas a latín (≈ 145 KB en total), `font-display: swap` y precarga de la de texto | `fonts/`, `@font-face`, `<head>` |
| Tras la primera visita, CSS, JS y fuentes salen de la caché del service worker | `sw.js` |

## Seguridad

- Todo texto que viene de APIs o de lo que escribe la persona se **escapa** antes de insertarlo como HTML (`Radio.esc`).
- **Content-Security-Policy** en las seis páginas: solo scripts propios, de cdnjs y de GoatCounter; conexiones solo a los servicios de datos; sin `object`, sin formularios, `base-uri` fijo (D16).
- **Integridad (SRI)** y versión fija en las librerías de cdnjs.
- Política de referer `strict-origin-when-cross-origin`.
- Enlaces externos con `rel="noopener"`.
- Sin `eval` ni HTML recibido de terceros.
- Los flujos de GitHub Actions tienen los permisos mínimos (lectura; el de enlaces, además, escribir avisos).
- Todo lo anterior lo vigila `tools/check.mjs` §11. Detalle en [ARQUITECTURA.md §11](ARQUITECTURA.md#11-seguridad).
- Limitación: GitHub Pages no permite cabeceras HTTP propias, así que no hay `frame-ancestors` ni HSTS propio (GitHub ya fuerza HTTPS).

## SEO y compartir

- Título, descripción y URL canónica propios en cada página.
- Etiquetas Open Graph y Twitter con imagen de 1200 × 630 (`og.png`).
- `sitemap.xml` con las seis páginas. Nota: los buscadores leen `robots.txt` solo en la raíz del dominio (`bendi.dev/robots.txt`); para que encuentren este sitemap hay que añadir allí `Sitemap: https://bendi.dev/radio/sitemap.xml` o darlo de alta en Google Search Console.

## Limitaciones conocidas

- **El banco del examen no lo ha revisado un radioaficionado con licencia.** Antes de recomendarlo para estudiar en serio conviene una revisión externa (por ejemplo, de un radioclub).
- **Las grabaciones reales dependen de Wikimedia Commons** y son en inglés o alemán: no hay grabaciones libres de radioaficionados españoles. Los sonidos de la cascada siguen siendo sintéticos.
- **El progreso vive en un solo navegador.** Se puede guardar en un archivo y recuperarlo, pero no se sincroniza solo entre dispositivos.
- **Dependencia de servicios gratuitos de terceros** (HamQTH, CelesTrak, Esri, Radio Browser, WebSDR de Twente). Cada sección muestra un mensaje si su servicio falla, pero no hay alternativa automática.
- **Datos que caducan:** las secciones de la URE y las tasas son una foto del 1 de noviembre de 2026; el calendario se calcula con reglas, no con fechas confirmadas.
- **El mapa de radioclubes sitúa cada provincia en su capital**, no cada sección en su local.
- **Los textos de los lienzos no los lee un lector de pantalla**, pero su contenido está siempre en texto al lado.
