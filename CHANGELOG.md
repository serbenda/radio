# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada versión corresponde a una pull request fusionada en `main`.

## [2.5.0] · 2 de noviembre de 2026 · Dominio propio radio.bendi.dev

### Cambiado
- **La web se mueve a <https://radio.bendi.dev/>** (inglés en <https://radio.bendi.dev/en/>). Las direcciones antiguas `bendi.dev/radio/…` redirigen solas a la misma página en la nueva. Archivo `CNAME`, canónicas, `hreflang`, Open Graph, `sitemap.xml`, enlaces para compartir, tarjeta QSL, plantillas de aviso, comprobaciones y documentación apuntan al nuevo dominio. Motivo y consecuencias en `docs/DECISIONES.md` D21.
- Las visitas se siguen apuntando en GoatCounter como `/radio/…`, para no mezclarlas con las de la web personal.
- `404.html` y el `id` del manifest, en la raíz del nuevo dominio.

### Publicado
- El diseño "Dial nocturno" y las herramientas para radioaficionados (tu primera estación, repetidores y DMR, balizas y QO-100), anotados en la 2.4.0, se quedaron fuera de la pull request de esa versión y llegan con esta.

### Corregido
- Documentación de estilos (esquinas, antetítulos, chips) y créditos de tipografías del README, que seguían describiendo el diseño anterior.

## [2.4.0] · 1 de noviembre de 2026 · En inglés

### Cambiado
- **Nuevo diseño "Dial nocturno"**: la web se ve como un receptor de válvulas de noche. Azul medianoche, ámbar de la lámpara del dial y aguja roja; titulares condensados como los rótulos de los equipos y texto en Atkinson Hyperlegible, pensada para leer sin esfuerzo; el menú es una escala con la aguja en la página actual; barras de progreso como un medidor S; cascada con los colores de un SDR; nuevos iconos e imagen para compartir.

### Añadido
- **Versión en inglés** de toda la web en `/radio/en/` (`en/listen/`, `en/understand/`, `en/practice/`, `en/exam/`, `en/start/`), con los mismos módulos, secciones y progreso guardado.
- **Selector ES/EN** en la cabecera de cada página, que lleva a la misma página y sección en el otro idioma.
- **Examen en inglés:** las 169 preguntas traducidas, con los mismos ids, opciones y respuestas.
- Contactos simulados en inglés con voces en inglés; lecciones, glosario, calendario y textos de todos los módulos en los dos idiomas (`Radio.t`).
- `hreflang` en todas las páginas y en `sitemap.xml`; páginas de error y sin conexión bilingües.
- `tools/check.mjs` §12: cada página tiene su versión en inglés con las mismas secciones, y el examen en inglés coincide con el castellano.
- `docs/IDIOMAS.md`: cómo está hecha la versión en inglés y cómo traducir algo nuevo.
- **Grabaciones reales en la cascada:** al reproducir una grabación de Wikimedia Commons, se dibuja en la cascada de "¿Qué es este sonido?" para compararla con la imitación.
- **Tu primera estación** (Empezar): qué hace falta (fuente, coaxial, medidor de ROE, seguridad, vecinos) y **calculadora de antenas** (dipolo y vertical de cuarto de onda para cualquier banda) y de pérdidas del cable.
- **Repetidores y radio digital** (Practicar): cómo se usa un repetidor (desplazamiento, tono, etiqueta), DMR, C4FM, D-STAR, EchoLink y APRS, con **calculadora de desplazamiento**.
- **Las balizas, ahora mismo** (Entender): qué baliza de la red NCDXF/IARU está en cada frecuencia en este segundo, con enlace para escucharla.
- **Más satélites** (Entender): **QO-100** con hacia dónde apuntar la parabólica desde tu ciudad, sus frecuencias y la autorización española de 2,4 GHz (hasta el 26 de diciembre de 2026), y **satélites FM** (SO-50, AO-91) con sus frecuencias y próximos pases.
- **La radio en clase** (Empezar): plan de una sesión de 50 minutos para 10 a 16 años y ficha A4 imprimible (alfabeto fonético, Morse, guion de contacto y libro de guardia), en los dos idiomas.

## [2.3.0] · 1 de noviembre de 2026 · Instalable en Android e iPhone, buenas prácticas y documentación completa

### Añadido
- **Instalar la app** en Android, iPhone, iPad y ordenador: botón "Instalar la app" en el pie (instalación directa donde el navegador lo permite) e instrucciones paso a paso para cada sistema en la portada. Capturas en el manifest para la ventana de instalación de Android y metadatos para la pantalla de inicio de iPhone.
- **Licencias:** MIT para el código y CC BY-SA 4.0 para textos, preguntas, documentación e imágenes propias.
- **Apoya el proyecto:** enlace a GitHub Sponsors en el pie de cada página, en el README y botón "Sponsor" en el repositorio.
- **Comprobación semanal de enlaces externos** (`tools/enlaces.mjs`) que abre un aviso si alguno se rompe.
- **Documentación completa:** README renovado con capturas; índice de la documentación; cómo se construyó; arquitectura con diagramas; tutorial; guía de recetas; solución de problemas; estilos; glosario; guía de contribución y plantilla de pull request. Todo el código comentado función a función.
- `tools/check.mjs`: comprobaciones de seguridad (CSP, integridad, `noopener`, tipografías).
- **Ramas protegidas en GitHub:** `main` solo con pull request y comprobaciones en verde; ni `main` ni `development` se pueden forzar ni borrar.

### Cambiado
- **Buenas prácticas:** auditoría de accesibilidad con axe y sus arreglos; tipografías alojadas en la web (sin Google Fonts); Content-Security-Policy; integridad (SRI) de las librerías; aviso para quien navega sin JavaScript.

### Arreglado
- "Ahora en el aire" deja de consultar con la pestaña oculta, nunca consulta HamQTH antes de 15 s aunque se entre y salga de la sección, y muestra las frases aunque no cargue el mapa. Sus filtros indican cuál está pulsado a los lectores de pantalla.
- Con "reducir movimiento" ya no queda ninguna animación (latido de los sonidos, medidor del contacto).
- Quitados estilos sin uso.
- `tools/check.mjs` ya no confunde comentarios con código.

## [2.2.0] · 1 de noviembre de 2026 · Más preguntas, sonidos reales y sin conexión

### Añadido
- **Examen:** el banco pasa de 68 a 169 preguntas (95 de la parte 1 y 74 de la parte 2), revisadas por separado contra la Orden IET/1311/2013.
- **Grabaciones reales** (Escuchar): once audios grabados en el aire con licencia libre de Wikimedia Commons (llamada CQ, informe de señal, concurso, satélite, repetidores, balizas, señal horaria), con autor y licencia en cada uno.
- **Instalable y sin conexión:** manifest, iconos y service worker. Tras la primera visita, el examen, el Morse, las lecciones y los contactos simulados funcionan sin cobertura. Página `offline.html` para lo que no está guardado.
- **Guardar y recuperar tu progreso** en un archivo (Inicio), para cambiar de móvil o de navegador.
- **Avisar de errores:** formularios de GitHub para preguntas del examen, errores de contenido y sugerencias; el pie de cada página y cada pregunta del examen abren el formulario ya rellenado.
- **Métricas de hitos** sin datos personales (contactos simulados, simulacros, insignias, lecciones, niveles de Morse) para saber si la web cumple su objetivo.
- `tools/check.mjs`: comprobaciones del modo sin conexión y de las métricas.

### Cambiado
- Icono propio en lugar del emoji.

### Arreglado
- Cinco preguntas del examen con errores (sufijos Y y Z, "portable" frente a "portátil", autorización de menores) y diez con ambigüedades, explicaciones desactualizadas o estilo mejorable. La pregunta frecuente sobre menores, más precisa.

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
