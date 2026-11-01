# Registro de decisiones

Las decisiones de diseño importantes, con su contexto y sus consecuencias, para no tener que volver a discutirlas (o para saber qué cambiar si cambia el contexto). Formato: una entrada por decisión, la más reciente arriba.

---

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

**Consecuencias.** Banco pequeño (68 preguntas) que necesita revisión de un radioaficionado con licencia y crecer con el tiempo.

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
