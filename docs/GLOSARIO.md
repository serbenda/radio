# Glosario para mantener la web

Términos técnicos que aparecen en el código y en la documentación, explicados para quien no es especialista. Dos partes: **web** y **radio**.

## Web y programación

| Término | Qué es | Dónde se usa aquí |
| --- | --- | --- |
| **Accesibilidad (a11y)** | Que la web se pueda usar con teclado, lector de pantalla, zoom o poca visión | Atributos `aria-*`, contraste, foco visible ([CALIDAD.md](CALIDAD.md)) |
| **API** | Dirección web que devuelve datos (normalmente JSON) en vez de una página | Radio Browser, HamQTH, CelesTrak |
| **ARIA** | Atributos (`aria-label`, `aria-pressed`…) que explican a los lectores de pantalla qué es y en qué estado está un elemento | Botones, barras de progreso, regiones |
| **axe** | Herramienta que revisa la accesibilidad de una página automáticamente | Auditoría de [PRUEBAS.md](PRUEBAS.md#auditoría-de-accesibilidad) |
| **Caché** | Copia guardada de un archivo para no volver a descargarlo | Service worker, navegador |
| **Canvas** | Elemento HTML para dibujar con JavaScript píxel a píxel | Cascada, lecciones, tarjeta QSL |
| **CDN** | Servidor que reparte librerías populares por todo el mundo | cdnjs (Leaflet, satellite.js) |
| **Commit** | Un cambio guardado en Git, con mensaje y autor | — |
| **CORS** | Regla del navegador: una web solo puede pedir datos a otro dominio si ese dominio lo permite | Por eso solo se usan APIs con CORS abierto |
| **CSP (Content-Security-Policy)** | Lista de qué puede cargar la página y desde dónde; el navegador bloquea el resto | `<meta>` en todas las páginas |
| **CSS** | Lenguaje de estilos (colores, tamaños, posiciones) | `css/style.css` |
| **DOM** | La página tal como la ve JavaScript: un árbol de elementos que se puede cambiar | Todos los módulos |
| **Evento** | Aviso que se lanza cuando pasa algo (un clic, un logro) | `radio:event`, `radio:qso`… ([ARQUITECTURA §8](ARQUITECTURA.md#8-comunicación-entre-módulos-eventos)) |
| **fetch** | Función de JavaScript para pedir datos a una dirección web | Módulos con datos en directo |
| **Git / GitHub** | Git guarda el historial de cambios; GitHub lo aloja en internet | — |
| **GitHub Actions** | Tareas automáticas de GitHub (comprobar, revisar enlaces) | `.github/workflows/` |
| **GitHub Pages** | Servicio de GitHub que publica una rama como web | Publica `main` en `radio.bendi.dev` |
| **IIFE** | Función que se ejecuta sola nada más definirse: `(() => { … })();`. Evita que las variables se escapen al ámbito global | Todos los módulos |
| **IntersectionObserver** | API del navegador que avisa cuando un elemento entra o sale de la pantalla | `Radio.whileVisible`, `Radio.onceVisible` |
| **JSDoc** | Comentarios `/** … */` con `@param` y `@returns` que documentan funciones | Todo `js/` |
| **JSON** | Formato de texto para datos (`{"clave": "valor"}`) | APIs, `localStorage`, copia de progreso |
| **localStorage** | Pequeño almacén del navegador, por sitio web, que no caduca | Progreso: claves `radio.*` |
| **Manifest** | Archivo con nombre, iconos y colores para instalar la web como app | `manifest.webmanifest` |
| **Mermaid** | Lenguaje para escribir diagramas como texto; GitHub los dibuja | Diagramas de `docs/` |
| **PR (pull request)** | Propuesta de llevar cambios de una rama a otra, con revisión | `development` → `main` |
| **PWA** | Web instalable que funciona sin conexión | Manifest + service worker |
| **Rama (branch)** | Línea de trabajo paralela en Git | `development` (trabajo) y `main` (publicado) |
| **Service worker** | Script que el navegador pone entre la página y la red; permite funcionar sin conexión | `sw.js` |
| **SRI (integrity)** | Huella (hash) de un archivo externo; si el archivo cambia, el navegador no lo ejecuta | Leaflet y satellite.js |
| **Stale-while-revalidate** | Servir la copia guardada al momento y renovarla en segundo plano | CSS, JS y fuentes en `sw.js` |
| **SVG** | Imágenes vectoriales escritas como texto; se ven nítidas a cualquier tamaño | Lecciones, iconos de mapas |
| **Web Audio** | API del navegador para generar y procesar sonido | Morse, sonidos sintéticos, ruido del contacto |
| **WOFF2** | Formato comprimido de tipografías para la web | `fonts/` |

## Radio

| Término | Qué es |
| --- | --- |
| **Banda** | Rango de frecuencias reservado a un uso. Se nombran por su longitud de onda: "40 metros" ≈ 7 MHz |
| **BLU / SSB (LSB, USB)** | Banda lateral única: modo de voz que ocupa poco. LSB (inferior) por debajo de 10 MHz, USB (superior) por encima, salvo 60 m |
| **Baliza** | Estación automática que emite su indicativo para comprobar la propagación |
| **Cascada (waterfall)** | Gráfico de colores de los receptores: frecuencia en horizontal, tiempo hacia abajo |
| **CB-27** | Banda ciudadana (27 MHz), de uso común sin licencia en España |
| **CQ** | Llamada general: "¿alguien quiere hablar?" |
| **CW** | Telegrafía (Morse) |
| **DX / DX cluster** | Contacto lejano / red donde se anuncian estaciones oídas en directo |
| **Dipolo** | Antena básica: dos cables alimentados por el centro |
| **FT8** | Modo digital muy usado: ordenadores que intercambian mensajes cortos cada 15 s |
| **HF / VHF / UHF** | Onda corta (3–30 MHz) / muy alta (30–300 MHz) / ultra alta (300 MHz–3 GHz) |
| **Indicativo** | El "nombre" oficial de una estación (EA4ABC). El prefijo (EA) indica el país y el número, la zona |
| **Ionosfera** | Capas de la atmósfera que reflejan la onda corta y permiten contactos lejanos |
| **ISS** | Estación Espacial Internacional; tiene radio de aficionado |
| **Koch (método)** | Aprender Morse a velocidad real empezando por dos letras y añadiendo más al acertar |
| **MUF** | Frecuencia máxima utilizable para un salto ionosférico |
| **PMR446** | Walkies sin licencia (446 MHz, 0,5 W) |
| **POTA** | "Parks on the Air": emitir desde parques naturales |
| **Propagación** | Cómo viaja la señal: depende del sol, la hora y la frecuencia |
| **QSL** | Tarjeta que confirma un contacto |
| **QSO** | Contacto por radio |
| **RST / RS** | Informe de cómo llega la señal: legibilidad, fuerza (y tono en Morse). "59" = perfecto |
| **SDR / WebSDR** | Radio definida por software / receptor así que se maneja desde el navegador |
| **SGP4** | Modelo matemático para calcular dónde está un satélite a partir de su TLE |
| **TLE** | Dos líneas de texto con los datos de la órbita de un satélite |
| **UTC** | Hora universal; la que usan los radioaficionados para anotar |

Más jerga, explicada para el público, en la página Practicar → "Cómo se habla por radio" y en el glosario emergente.
