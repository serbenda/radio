# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada versión corresponde a una pull request fusionada en `main`.

## [2.1.0] · 1 de noviembre de 2026 · CB-27 y qué radio comprar

### Añadido
- **¿Y la CB-27 y los walkies?** (Empezar): la Banda Ciudadana como uso común sin licencia desde 2015 (40 canales, canal 9 de emergencias, 4 W en FM y AM, 12 W en BLU, antena de hasta 6 dB, prohibiciones), los walkies PMR446 y una tabla que compara PMR446, CB-27 y radioaficionado.
- **Qué radio comprar (y qué es legal)** (Empezar): qué se puede hacer con y sin licencia, todo lo que hay que saber de las Baofeng, siete modelos para empezar con precio orientativo y recomendaciones según tu situación.
- Dos preguntas frecuentes (Baofeng sin licencia, CB-27) y dos términos del glosario (CB-27, PMR446).

## [2.0.0] · 1 de noviembre de 2026 · Varias páginas y buenas prácticas

### Cambiado
- La web pasa de una sola página de 21 secciones a **seis páginas**: Inicio, Escuchar, Entender, Practicar, Examen y Empezar, cada una con título, índice y enlace al siguiente paso. Menú de 6 entradas.
- `app.js` se divide en módulos (`dial`, `guided`, `bands`, `morse-ui`, `jargon`, `checklist`, `faq`) y aparece `core.js`, el núcleo común `Radio`.
- Todos los módulos se desactivan solos si su sección no está en la página.
- "Tu primer mes" funciona en todas las páginas y enlaza a la página correcta.

### Arreglado
- Las animaciones (dial, lecciones) ya no corren fuera de pantalla ni con la pestaña oculta; la cascada de sonidos se para sola.
- Los pasos de propagación y de "Ahora en el aire" ya no se marcan solos al pasar: hay que tocar una banda, filtrar o abrir un aviso.
- El glosario ya no marca términos dentro del dial.

### Añadido
- Receptores web alternativos en la escucha guiada.
- Semáforo de propagación pulsable, con lo que significa cada estado.
- Redirección de los enlaces antiguos (`bendi.dev/radio/#ahora` → `escuchar/#ahora`).
- Accesibilidad: enlace "Saltar al contenido", `aria-current`, `aria-pressed`, `aria-expanded`, `aria-valuetext` en el dial, textos `aria-live` junto a los gráficos.
- `sitemap.xml`, metadatos propios por página.
- `tools/check.mjs` (57 comprobaciones) y flujo de GitHub Actions que lo ejecuta en cada PR.
- Documentación completa en `docs/` y cabeceras de documentación en cada módulo.

## [1.4.0] · Fase 4 · Que se quede
- Radioclubes: las 162 secciones de la URE en 52 provincias, solo con datos públicos.
- Calendario de eventos calculado con sus reglas.
- "¿Es para mí?", costes por escalones, guía para familias y referencias de Hispanoamérica.

## [1.3.0] · Fase 3 · Que vuelva
- "Tu primer mes": 4 semanas, 14 pasos e insignias.
- "Ahora en el aire": avisos del DX cluster en directo con HamQTH.
- Pases de la ISS con CelesTrak y satellite.js.
- Contador de visitas de GoatCounter.

## [1.2.0] · Fase 2 · Que aprenda
- Simulador del examen con 68 preguntas, tarjetas adaptativas y simulacro.
- Entrenador de Morse con método Koch.
- Contactos simulados: concurso, parque POTA, emergencia y la ISS.
- El trámite en cifras y lista de comprobación.

## [1.1.0] · Fase 1 · Que entienda
- Glosario emergente.
- Lecciones interactivas en tres niveles.
- "¿Qué es este sonido?" con cascada en directo.
- Propagación en lenguaje llano con datos solares.

## [1.0.0] · Primera versión
- Dial, mapa de emisoras, receptores en directo, bandas, propagación, Morse, jerga, primer contacto simulado con QSL, escucha guiada, imagen para compartir, cómo empezar en España, mini test y FAQ.
