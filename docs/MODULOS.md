# Módulos de JavaScript

Referencia de cada archivo de `js/`. Cada archivo tiene además una cabecera con este mismo resumen.

## Convenciones

- **Un archivo, una funcionalidad.** Si una función crece y hace dos cosas, se parte.
- **Función autoejecutable** `(() => { 'use strict'; … })();` para no ensuciar el ámbito global. Las únicas variables globales son los datos (`BANDS`, `EXAM`…), `Morse` y `Radio`.
- **Salvaguarda al principio**: si el elemento raíz de su sección no está en la página, el módulo termina sin hacer nada. Así cualquier módulo se puede cargar en cualquier página sin romperla.
- **Escapar siempre** lo que venga de fuera (APIs, lo que escribe la persona) con `Radio.esc` o el `esc` local antes de meterlo en `innerHTML`.
- **`localStorage` solo a través de `Radio.store`** (o con `try/catch`), con claves `radio.*`.
- **Logros con `Radio.emit(nombre, id)`**, nunca tocando `radio.journey` directamente.
- **Botones de verdad** (`<button type="button">`) para todo lo que se pulsa, con `aria-pressed` o `aria-expanded` cuando tienen estado.
- **Animaciones con `Radio.whileVisible`** y respetando `Radio.reducedMotion`.
- **Textos en español de España**, frases cortas y sin jerga sin explicar.

## Núcleo y datos

| Archivo | Qué hace | Globales que expone |
| --- | --- | --- |
| `core.js` | Utilidades compartidas, reloj UTC, menú activo, botón de compartir, enlace "Avísanos", métricas de hitos y registro del service worker | `Radio` |
| `data.js` | Contenido estático: bandas, alfabeto, jerga, FAQ, escucha guiada, receptores | `BANDS`, `DIAL_BANDS`, `PHONETIC`, `GLOSSARY`, `FAQ`, `WEBSDR`, `LISTEN`, `RECEIVERS` |
| `exam-data.js` | Banco de preguntas del examen | `EXAM` |
| `clubs-data.js` | Secciones de la URE (datos públicos) | `URE_SECTIONS` |
| `morse.js` | Tabla Morse, codificación y sonido | `Morse` |

### Fuera de `js/`

| Archivo | Qué hace |
| --- | --- |
| `sw.js` | Service worker: guarda la web para usarla sin conexión (estrategia en [DECISIONES.md](DECISIONES.md), D12). Subir `VERSION` en cada versión |
| `manifest.webmanifest` | Nombre, iconos (`img/`) y accesos directos para instalar la web |
| `offline.html` | Lo que se ve sin conexión en una página que aún no se había visitado |

## Módulos por página

### Todas las páginas

| Archivo | Raíz | Qué hace | Guarda | Eventos |
| --- | --- | --- | --- | --- |
| `journey.js` | `#weeks` (solo pinta en la portada) | Registra logros en cualquier página y pinta "Tu primer mes" | `radio.journey` | Escucha `radio:event`, `radio:qso`, `radio:mock`, `radio:progress`; emite `websdr` al pulsar enlaces a receptores |
| `glossary.js` | `main > section` | Marca la jerga y muestra el bocadillo | — | — |

### Inicio

| Archivo | Raíz | Qué hace |
| --- | --- | --- |
| `backup.js` | `#backup` | Guarda todo el progreso (`radio.*`) en un archivo JSON y lo recupera, con validación y confirmación |
| `dial.js` | `#dialKnob` | Dial de onda corta con escala logarítmica, banda y comportamiento a esta hora; señal animada solo en pantalla |

### Escuchar

`recordings.js` (`#recList`): grabaciones reales de Commons con atribución; una a la vez; emite `sound` al reproducir.

| Archivo | Raíz | Qué hace | Externo | Eventos |
| --- | --- | --- | --- | --- |
| `stations.js` | `#emisoras` | Mapa de emisoras, buscador, reproductor y línea gris | Radio Browser, Leaflet, Esri | `station` |
| `guided.js` | `#guided` | Escucha guiada en el WebSDR de Twente y receptores alternativos | WebSDR (enlace) | (`websdr` vía journey) |
| `live.js` | `#ahora` | Avisos del DX cluster en directo, en mapa y como frases | HamQTH, Leaflet, Esri | `live` |
| `sounds.js` | `#sonidos` | Ocho sonidos sintetizados con cascada en directo | — | `sound` |

### Entender

| Archivo | Raíz | Qué hace | Externo | Guarda / eventos |
| --- | --- | --- | --- | --- |
| `lessons.js` | `#como-funciona` | Cuatro lecciones interactivas en tres niveles con 3 preguntas | — | `radio.lessons`, `radio:progress` |
| `bands.js` | `#bands` | Bandas de 160 m a 70 cm | — | — |
| `propagation.js` | `#propagacion` | Frase y semáforo de bandas con datos solares; mapa de la MUF | HamQTH, KC2G | `prop` |
| `iss.js` | `#iss` | Posición de la ISS y próximos pases | CelesTrak, satellite.js, Leaflet, Esri | `iss` |

### Practicar

| Archivo | Raíz | Qué hace | Guarda / eventos |
| --- | --- | --- | --- |
| `morse-ui.js` | `#morseIn` | Traductor a Morse con sonido | — |
| `koch.js` | `#kochStart` | Entrenador Koch con reconocimiento instantáneo | `radio.koch`, `radio:progress` |
| `jargon.js` | `#phoneticIn` | Deletreo fonético y glosario en lista | — |
| `qso.js` | `#qso` | Cinco contactos simulados y tarjeta QSL | `radio:qso` |

### Examen

| Archivo | Raíz | Qué hace | Guarda / eventos |
| --- | --- | --- | --- |
| `exam.js` | `#test` | Estudio con cajas de Leitner, repaso de fallos, termómetro y simulacro | `radio.exam`, `radio:progress`, `radio:mock` |

### Empezar

| Archivo | Raíz | Qué hace | Externo | Guarda / eventos |
| --- | --- | --- | --- | --- |
| `checklist.js` | `#checklist` | Lista "de cero a indicativo" | — | `radio.checklist`, `radio:progress` |
| `clubs.js` | `#clubes` | Mapa de radioclubes por provincia y calendario de eventos | Leaflet, Esri | — |
| `family.js` | `#fitQs` | Autotest "¿Es para mí?" | — | — |
| `faq.js` | `#faqList` | Preguntas frecuentes | — | — |

## Cómo añadir un módulo nuevo

1. Crea `js/mi-modulo.js` con la cabecera de documentación (copia la de otro módulo) y la salvaguarda:

   ```js
   (() => {
     'use strict';
     const { $, esc, store } = Radio;
     const root = $('mi-seccion');
     if (!root) return;
     // …
   })();
   ```

2. Añade su `<section id="mi-seccion">` en la página que toque.
3. Carga el script en esa página, después de `journey.js` y antes de `glossary.js`.
4. Si debe contar para "Tu primer mes", emite `Radio.emit('nombre', id)` cuando la persona **haga** algo (no al cargar) y añade el paso en `journey.js`.
5. Documenta el módulo en esta página y, si usa un servicio externo, en [DATOS.md](DATOS.md).
6. Ejecuta `node tools/check.mjs`: avisará si el archivo no se usa en ninguna página o si un enlace está roto.
