# Registro de decisiones

Las decisiones de diseño importantes, con su contexto y sus consecuencias, para no tener que volver a discutirlas (o para saber qué cambiar si cambia el contexto). Formato: una entrada por decisión, la más reciente arriba.

---

## D19 · Versión en inglés con páginas propias y textos en el código (1 nov 2026)

**Contexto.** Se quiere la web en inglés además de en castellano, sin paso de compilación (D10) y sin duplicar la lógica.

**Decisión.** Páginas HTML propias en `en/` con nombres de carpeta en inglés (mejor para buscadores y para quien comparte el enlace), con la misma estructura e ids que las castellanas. Los textos que pinta JavaScript se escriben juntos en el código con `Radio.t('castellano', 'English')`, para que al cambiar uno se vea el otro. El banco del examen, por su tamaño, va en un archivo aparte (`js/en/exam-data.js`) con los mismos ids y respuestas. `Radio.url()` traduce solo las rutas entre páginas. `hreflang` en páginas y sitemap; `x-default` es el castellano. No se redirige automáticamente según el idioma del navegador: hay un selector visible ES/EN.

**Consecuencias.** Cada cambio de texto en una página hay que hacerlo en las dos versiones; `tools/check.mjs` §12 avisa si las secciones dejan de coincidir y §6 si el examen inglés se desalinea. El progreso es el mismo en los dos idiomas. Los formularios de aviso y la documentación siguen en castellano. Detalle: [IDIOMAS.md](IDIOMAS.md).

## D18 · Instalar la app: botón propio y pasos por sistema (1 nov 2026)

**Contexto.** La web ya era instalable (D12), pero casi nadie sabe que una web se puede instalar, y cada sistema lo hace distinto: Android y Chrome/Edge ofrecen una ventana de instalación (`beforeinstallprompt`); iPhone e iPad no la tienen y solo se instala desde Compartir → Añadir a pantalla de inicio.

**Decisión.** `install.js` en todas las páginas: guarda `beforeinstallprompt` y muestra "Instalar la app" en el pie (y "Instalar ahora" en la portada), que abre la ventana del sistema; en iPhone/iPad el botón lleva a la sección `#instalar` de la portada, que abre sola los pasos del sistema detectado, con el icono de Compartir dibujado. Si ya se usa instalada, no se ofrece. El manifest lleva capturas (móvil y ancha) para la ventana de instalación enriquecida de Android, y las páginas, metadatos `apple-mobile-web-app-*` para el nombre y la barra de estado en iPhone. No se publica en tiendas (Play Store, App Store): no hace falta para usarla y exigiría cuentas, revisiones y empaquetado.

**Consecuencias.** Se mide si se instala (hitos `instalar/aceptada`, `instalar/rechazada`, `instalar/hecha`). Si cambia mucho el diseño, conviene regenerar las capturas `img/captura-*.png` (sus dimensiones deben coincidir con `sizes` del manifest). Si algún día se quiere estar en Google Play, la vía es empaquetar esta misma web como TWA con Bubblewrap.

## D17 · Licencias: MIT para el código y CC BY-SA 4.0 para el contenido (1 nov 2026)

**Contexto.** Sin licencia, nadie puede reutilizar legalmente nada del repositorio, ni siquiera un radioclub que quiera usar las preguntas en un curso. El código y el contenido tienen necesidades distintas.

**Decisión.** Código bajo **MIT** (`LICENSE`): la más sencilla y extendida, permite reutilizarlo con solo mantener el aviso. Contenido (textos, preguntas, documentación, imágenes propias) bajo **CC BY-SA 4.0** (`LICENSE-CONTENIDO.md`): se puede reutilizar, también con fines comerciales, citando la fuente y compartiendo las mejoras con la misma licencia, como Wikipedia. Lo de terceros conserva su licencia (tabla en `LICENSE-CONTENIDO.md`). Además, enlace a **GitHub Sponsors** en el pie de cada página, en el README y en el botón del repositorio (`.github/FUNDING.yml`), sin publicidad ni muros de pago.

**Consecuencias.** Las grabaciones CC BY-SA ya eran compatibles. Quien contribuya acepta esas licencias (CONTRIBUTING.md). El clic en "Apoya el proyecto" se cuenta como hito (`apoyo/sponsors`), sin datos personales.

## D16 · Content-Security-Policy e integridad de librerías (1 nov 2026)

**Contexto.** La web carga scripts de cdnjs y GoatCounter y pide datos a cuatro servicios. Si uno de esos terceros fuera comprometido, o si se colara HTML con un `<script>`, podría ejecutarse código ajeno. GitHub Pages no permite configurar cabeceras HTTP.

**Decisión.** Una Content-Security-Policy en `<meta>`, igual en las seis páginas, que solo permite scripts propios, de cdnjs y de GoatCounter, y conexiones a los cuatro servicios de datos. Las librerías de cdnjs llevan versión fija y atributo `integrity` (SHA-512) con `crossorigin="anonymous"`. Política de referer `strict-origin-when-cross-origin`.

**Consecuencias.** Añadir un servicio o librería exige tocar la CSP de las seis páginas (si no, el navegador lo bloquea y lo dice en la consola). Para actualizar Leaflet o satellite.js hay que poner el nuevo hash de cdnjs. Lo vigila `tools/check.mjs` §11. `frame-ancestors` no se puede poner por `<meta>`: queda pendiente si algún día hay cabeceras.

## D15 · Tipografías alojadas en el propio repositorio (1 nov 2026)

**Contexto.** Las fuentes venían de Google Fonts: cada visita avisaba a Google (privacidad), dependía de un tercero y no funcionaba sin conexión.

**Decisión.** Fraunces, IBM Plex Sans e IBM Plex Mono en `fonts/`, en WOFF2, recortadas a latín y latín extendido y a los pesos usados (variables donde se puede). Licencia SIL OFL incluida. `font-display: swap` y precarga de la fuente de texto.

**Consecuencias.** ≈ 145 KB en total, cacheados por el service worker. Si se necesita un carácter fuera del recorte (por ejemplo, griego), hay que regenerar los archivos: ver [ESTILOS.md](ESTILOS.md#tipografías).

## D14 · Avisos de errores con formularios de GitHub (1 nov 2026)

**Contexto.** El contenido (examen, tasas, CB-27, modelos de radio) caduca o puede tener errores, y quien mejor los detecta son radioaficionados con licencia que no tienen por qué saber usar GitHub.

**Decisión.** Formularios de incidencia (`.github/ISSUE_TEMPLATE/`) para pregunta del examen, error de contenido y sugerencia. La web abre el formulario ya rellenado: el pie pone la página actual y cada pregunta del examen pone su identificador (`Radio.report`).

**Consecuencias.** Hace falta una cuenta de GitHub para avisar. Las incidencias llegan etiquetadas (`examen`, `contenido`, `idea`) y con la fuente pedida, así que revisarlas es rápido.

## D13 · Métricas de hitos, no de personas (1 nov 2026)

**Contexto.** Contar visitas no dice si la web cumple su objetivo (que alguien pase de curioso a radioaficionado). Hace falta saber cuánta gente termina un contacto, aprueba un simulacro o gana una insignia.

**Decisión.** `Radio.track(hito)` envía a GoatCounter un evento con un **nombre fijo** (`qso/concurso`, `examen/simulacro-apto`, `insignia/semana-2`…). Nunca lleva texto que escriba la persona ni identificadores. Sin cookies, igual que las visitas. `tools/check.mjs` falla si un `Radio.track` usa un nombre que no sea fijo. Lista completa en [PRIVACIDAD.md](PRIVACIDAD.md#métricas-de-hitos).

**Consecuencias.** Se puede medir el embudo (escuchar → practicar → examen) sin datos personales. Si GoatCounter está bloqueado, no se cuenta nada y la web funciona igual.

## D12 · Instalable y sin conexión con un service worker propio (1 nov 2026)

**Contexto.** Quien estudia el examen o el Morse lo hace en el móvil, a menudo en el transporte y sin cobertura. Además, el progreso vive en un solo navegador.

**Decisión.** `manifest.webmanifest` + `sw.js` escrito a mano (sin Workbox, coherente con D10). Páginas: primero la red y, sin ella, la copia guardada. CSS, JS, iconos y librerías: copia guardada y actualización en segundo plano. Datos en directo (emisoras, avisos, ISS, propagación, mapas, audio, métricas): nunca se guardan, porque enseñar datos viejos como "en directo" engañaría. Además, botones para guardar y recuperar el progreso en un archivo (`backup.js`).

**Consecuencias.** Examen, Morse, lecciones, contactos simulados y textos funcionan sin conexión tras la primera visita. Al publicar hay que subir `VERSION` en `sw.js` (lo vigila `tools/check.mjs` comparándola con el CHANGELOG); si no, la gente seguiría con los archivos viejos hasta la siguiente actualización en segundo plano.

## D11 · Varias páginas en lugar de una sola (1 nov 2026)

**Contexto.** La web había crecido a 21 secciones y unas 24 pantallas de alto. El estudio de webs de radioafición señalaba como defecto principal de las demás webs "un menú enorme, no un camino", y la propia web estaba cayendo en lo mismo.

**Decisión.** Seis páginas que siguen el recorrido de un novato: Inicio → Escuchar → Entender → Practicar → Examen → Empezar. Cada página interior tiene título, entradilla, índice y un enlace "Siguiente".

**Consecuencias.** Páginas de 2 a 8 pantallas. El menú pasa de 14 a 6 entradas. Hay que mantener la cabecera y el pie iguales en las seis (lo comprueba `tools/check.mjs`). Las URL antiguas con `#sección` en la portada se redirigen a su nueva página (`core.js`), así que los enlaces ya compartidos siguen funcionando.

## D10 · Sin paso de compilación y cabecera repetida en cada página (1 nov 2026)

**Contexto.** Al dividir en páginas, la cabecera y el pie se repiten. Se podía usar un generador (plantillas + compilación) o insertarlos con JavaScript.

**Decisión.** HTML escrito tal cual, con la cabecera y el pie copiados en cada página, y una comprobación automática que avisa si difieren.

**Por qué.** Lo que hay en el repositorio es exactamente lo que se publica, sin herramientas que instalar ni pasos que olvidar. Insertar la cabecera con JavaScript empeoraría la accesibilidad y el SEO. Con seis páginas, repetir 15 líneas es asumible.

## D09 · Núcleo común `Radio` y módulos que se desactivan solos (1 nov 2026)

**Contexto.** `app.js` mezclaba siete funcionalidades y todos los módulos daban por hecho que su sección existía.

**Decisión.** `core.js` con las utilidades comunes y un módulo por funcionalidad, cada uno con una salvaguarda: si su sección no está en la página, no hace nada.

**Consecuencias.** Cada página carga solo lo suyo y cualquier módulo se puede mover de página sin romper nada.

## D08 · Los pasos de "Tu primer mes" exigen hacer algo (1 nov 2026)

**Contexto.** Los pasos de propagación y de "Ahora en el aire" se marcaban solos al llegar a la sección.

**Decisión.** Un paso solo cuenta si la persona hace algo: tocar una banda del semáforo, filtrar el mapa, abrir un aviso, elegir una ciudad para la ISS.

## D07 · Animaciones solo en pantalla (1 nov 2026)

**Contexto.** El dial, las lecciones y la cascada seguían dibujando fuera de pantalla y con la pestaña oculta, gastando batería en el móvil.

**Decisión.** `Radio.whileVisible` arranca y para cada animación según se vea; la cascada se para 1,5 s después del último sonido; con "reducir movimiento" no se anima nada.

## D06 · Datos de radioclubes: solo lo público de cada sección (1 nov 2026)

**Contexto.** La web de la URE lista sus secciones con nombre, teléfono y correo de quien las preside.

**Decisión.** Publicar solo nombre de la sección, provincia, indicativo y web. Ningún dato personal, aunque esté publicado en otro sitio. `tools/check.mjs` falla si se cuela un correo, un teléfono o un cargo.

## D05 · Preguntas de examen propias, no copiadas (1 nov 2026)

**Contexto.** Los bancos de preguntas existentes en español son antiguos, sin explicaciones y de terceros.

**Decisión.** Escribir preguntas propias a partir del temario oficial (anexo II de la Orden IET/1311/2013), cada una con explicación y, en normativa, con el artículo.

**Consecuencias.** Banco inicial de 68 preguntas, ampliado a 169 en la versión 2.2.0 con una revisión independiente contra la Orden. Sigue necesitando la revisión de un radioaficionado con licencia (para eso están los formularios de aviso, D14).

## D04 · Cajas de Leitner y separar estudiar de medir (1 nov 2026)

**Contexto.** El estudio mostró que las mejores herramientas (HamStudy) separan el estudio adaptativo del simulacro.

**Decisión.** Tarjetas con cajas de Leitner (fallar devuelve la pregunta a la primera caja), termómetro de preparación y simulacro solo cuando el termómetro llega al 80 %.

## D03 · Morse con método Koch y velocidad real (1 nov 2026)

**Contexto.** Aprender Morse viendo puntos y rayas crea un vicio que luego cuesta quitar (opinión mayoritaria en LCWO, CW Academy y MorseCode.World).

**Decisión.** Letras a 20 ppm desde el principio, orden de Koch, empezar con dos letras y desbloquear según aciertos; las letras que fallas o tardas salen más.

## D02 · Mapa base de Esri en lugar de CARTO (1 nov 2026)

**Contexto.** El fondo oscuro de CARTO empezó a mostrar "API KEY REQUIRED".

**Decisión.** Teselas "World Dark Gray" de Esri, sin clave y con atribución. Alternativa si cambian las condiciones: OpenStreetMap con un filtro oscuro (ver [DATOS.md](DATOS.md)).

## D01 · Datos en directo desde el navegador, sin servidor (1 nov 2026)

**Contexto.** GitHub Pages solo sirve archivos estáticos.

**Decisión.** Usar solo servicios con CORS abierto y sin clave (HamQTH, CelesTrak, Radio Browser) y comprobarlo desde `bendi.dev` antes de usarlos. Se descartaron los que exigen clave o la prohíben en el navegador (QRZ, aprs.fi, N2YO, RepeaterBook).

**Consecuencias.** Sin costes ni mantenimiento de servidor, pero dependencia de servicios gratuitos de terceros: cada sección muestra un mensaje si su servicio falla.
