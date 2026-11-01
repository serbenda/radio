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
| Fuentes con `display=swap` y `preconnect` | `<head>` |

## Seguridad

- Todo texto que viene de APIs o de lo que escribe la persona se **escapa** antes de insertarlo como HTML (`Radio.esc`).
- Enlaces externos con `rel="noopener"`.
- Sin `eval` ni HTML recibido de terceros.
- El flujo de comprobaciones de GitHub Actions tiene permisos de solo lectura.

## SEO y compartir

- Título, descripción y URL canónica propios en cada página.
- Etiquetas Open Graph y Twitter con imagen de 1200 × 630 (`og.png`).
- `sitemap.xml` con las seis páginas. Nota: los buscadores leen `robots.txt` solo en la raíz del dominio (`bendi.dev/robots.txt`); para que encuentren este sitemap hay que añadir allí `Sitemap: https://bendi.dev/radio/sitemap.xml` o darlo de alta en Google Search Console.

## Limitaciones conocidas

- **El banco del examen no lo ha revisado un radioaficionado con licencia.** Antes de recomendarlo para estudiar en serio conviene una revisión externa (por ejemplo, de un radioclub).
- **Los sonidos son sintéticos.** Faltan grabaciones reales, sobre todo de voz en banda lateral, que es lo que más se oye.
- **El progreso vive en un solo navegador.** Si se borra o se cambia de dispositivo, se pierde. No hay exportación.
- **Dependencia de servicios gratuitos de terceros** (HamQTH, CelesTrak, Esri, Radio Browser, WebSDR de Twente). Cada sección muestra un mensaje si su servicio falla, pero no hay alternativa automática.
- **Datos que caducan:** las secciones de la URE y las tasas son una foto del 1 de noviembre de 2026; el calendario se calcula con reglas, no con fechas confirmadas.
- **El mapa de radioclubes sitúa cada provincia en su capital**, no cada sección en su local.
- **Los textos de los lienzos no los lee un lector de pantalla**, pero su contenido está siempre en texto al lado.
