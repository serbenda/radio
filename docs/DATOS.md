# Datos y servicios externos

Todo lo que la web pide a otros servidores: qué, dónde, con qué condiciones y qué pasa si falla.
Las comprobaciones de CORS se hicieron desde `https://bendi.dev` el **1 de noviembre de 2026**.

## Resumen

| Servicio | Uso | Clave | CORS | Límite que pide | Cómo lo respetamos | Si falla |
| --- | --- | --- | --- | --- | --- | --- |
| [Radio Browser](https://www.radio-browser.info) | Emisoras | No | Sí | Ser educado, contar escuchas | Una búsqueda al llegar o al filtrar; `/json/url/<uuid>` al reproducir | Mensaje "No hay señal del directorio"; prueba 4 servidores |
| [HamQTH spots](https://www.hamqth.com/developers.php) | Avisos en directo | No | Sí (`*`) | Máx. 1 consulta / 15 s; citar | Cada 60 s y solo con la sección visible; "Spots: HamQTH.com" en el mapa | Mensaje y reintento al minuto |
| [HamQTH solar](https://www.hamqth.com/developers.php) | Datos solares | No | Sí (`*`) | Máx. 1 consulta / 5 min | Al llegar a la sección y luego cada 15 min | Mensaje "No se han podido cargar" |
| [KC2G](https://prop.kc2g.com/) | Mapa de la MUF | No | No hace falta (`<img>`) | Citar | Enlace a KC2G bajo el mapa | Se oculta la tarjeta del mapa |
| [CelesTrak](https://celestrak.org/) | Órbitas de la ISS, SO-50 y AO-91 (TLE) | No | Sí | Uso razonable | Una descarga por satélite y visita | Mensaje "No se han podido descargar los datos" |
| [satellite.js](https://github.com/shashwatak/satellite-js) 5.0.0 | Cálculo orbital (SGP4) | — | cdnjs | Licencia MIT | Versión fija e `integrity` (SRI) | Mensaje "No se ha podido cargar el calculador" |
| [Leaflet](https://leafletjs.com) 1.9.4 | Mapas | — | cdnjs | Licencia BSD-2 | Atribución en el mapa; versión fija e `integrity` (SRI) | La sección muestra el listado sin mapa |
| [Esri World Dark Gray](https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer) | Teselas del mapa | No | No hace falta | Atribución obligatoria | "Mapa © Esri…" en cada mapa | Mapa sin fondo; datos visibles |
| [WebSDR de Twente](http://websdr.ewi.utwente.nl:8901/) | Receptor real | No | Solo enlace | — | Enlace con `?tune=<kHz><modo>` | Receptores alternativos debajo |
| [GoatCounter](https://www.goatcounter.com/) | Visitas y hitos | No | — | — | Script `async`, sin cookies; hitos con nombre fijo (`Radio.track`) | La web funciona igual |
| [Wikimedia Commons](https://commons.wikimedia.org/) | Grabaciones reales | No | No hace falta (`<audio>`) | Atribuir autor y licencia | Autor, enlace y licencia en cada tarjeta; `preload="none"` | Mensaje bajo el reproductor |

## Detalle por servicio

### Radio Browser · emisoras

- **Endpoint:** `https://<servidor>.api.radio-browser.info/json/stations/search` con `hidebroken=true`, `is_https=true`, `order=clickcount`, `reverse=true`, `limit=250` y `countrycode`, `tag` o `name`.
- **Servidores:** `de1`, `de2`, `fi1`, `at1`. Se prueba en orden y se recuerda el primero que responde.
- **Solo HTTPS**: la web se sirve por HTTPS y el navegador bloquearía audio por HTTP.
- **Cortesía**: al reproducir se llama a `/json/url/<uuid>`, que cuenta la escucha en el directorio.

### HamQTH · avisos y datos solares

- **Avisos:** `https://www.hamqth.com/api/v2/spots?limit=100&include=locations`. Devuelve `spots` (indicativo que oye, indicativo oído, kHz, banda, modo, comentario, hora, país, continente) y `locations` (latitud y longitud de cada indicativo, por su cuadrícula o su país).
- **Solar:** `https://www.hamqth.com/api/v2/solar`. Campos usados: `solarFlux`, `currentKIndex` (o `kIndex`), `fetchedAt`.
- **Condiciones:** su documentación dice que cualquier web puede llamar a la API (`Access-Control-Allow-Origin: *`), pide no consultar los avisos más de una vez cada 15 s ni los datos solares más de una vez cada 5 min, y pide indicar "Data provided by HamQTH.com". En la web aparece "Spots: HamQTH.com" en el mapa y "datos de HamQTH.com" bajo él y en la propagación.

### KC2G · mapa de la ionosfera

- **Imagen:** `https://prop.kc2g.com/renders/current/mufd-normal-now.svg` (MUF para saltos de 3.000 km, cada 15 min).
- Se usa como `<img>`, así que no depende de CORS. Si no carga, se oculta su tarjeta.

### CelesTrak · órbita de la ISS

- **TLE:** `https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE` (número NORAD 25544).
- El cálculo de posición y pases es local con satellite.js. La ubicación de la persona no sale del navegador.

### Esri · teselas de mapa

- **Base:** `…/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}` y **nombres:** `…/World_Dark_Gray_Reference/…`.
- Se eligió tras comprobar que el fondo oscuro de CARTO empezó a exigir clave (ver [DECISIONES.md](DECISIONES.md)).
- **Riesgo:** las condiciones de uso de los servicios de Esri pueden cambiar. Si un día exigen clave, la alternativa sin clave es OpenStreetMap con un filtro CSS oscuro, respetando su política de uso de teselas.

### WebSDR de Twente · receptor real

- Formato: `http://websdr.ewi.utwente.nl:8901/?tune=<kHz><modo>`, por ejemplo `?tune=7150lsb`. Modos usados: `lsb`, `usb`, `cw`, `am`.
- Comprobado el 1 de noviembre de 2026: abre ya sintonizado.
- Es HTTP, pero solo se enlaza (se abre en otra pestaña), así que no hay contenido mixto.
- Alternativas que se ofrecen: la lista de todos los WebSDR (`websdr.org`) y el mapa de KiwiSDR.

### Datos fijos de radio (comprobados el 2 nov 2026)

| Qué | Fuente | Dónde |
| --- | --- | --- |
| Horario de las 18 balizas NCDXF/IARU y sus 5 frecuencias | [NCDXF](https://www.ncdxf.org/beacon/), [Wikipedia](https://en.wikipedia.org/wiki/International_Beacon_Project) (lista de enero de 2024) | `js/beacons.js` |
| Plan de banda del QO-100 (subida 2400,005-2400,490; bajada 10489,500-10490,000 MHz) | [AMSAT-DL](https://amsat-dl.org/en/p4-a-nb-transponder-bandplan-and-operating-guidelines) | `entender/` |
| Autorización española de 2,4 GHz (temporal hasta el 26 dic 2026) | [URE](https://www.ure.es/autorizadas-de-la-banda-de-24-ghz/) | `entender/` · **revisar al acabar 2026** |
| Satélites FM (SO-50, AO-91, ISS) y estado de AO-91 | [AMSAT](https://www.amsat.org/live-fm-satellites/), [AO-91](https://www.amsat.org/two-way-satellites/ao-91/) | `entender/`, `js/sats.js` |
| Desplazamiento de repetidores (−600 kHz en 2 m, −7,6 MHz en 70 cm) | Plan de banda IARU Región 1 | `js/repeater.js` |
| Ley 19/1983 de antenas de radioaficionado | [BOE](https://www.boe.es/eli/es/l/1983/11/16/19/con) | `empezar/` |

## Recursos alojados en el propio repositorio

| Recurso | Origen | Licencia |
| --- | --- | --- |
| Tipografías (`fonts/`) | [Fraunces](https://github.com/undercasetype/Fraunces) e [IBM Plex](https://github.com/IBM/plex), desde [google/fonts](https://github.com/google/fonts), recortadas con `tools/fuentes.py` | SIL OFL 1.1 (`fonts/OFL-*.txt`) |
| Iconos (`img/`) y `og.png` | Propios | Los del proyecto |

## Política de seguridad de contenido

Todos los dominios a los que la web se conecta deben estar en la Content-Security-Policy de las seis páginas: `script-src` (cdnjs, GoatCounter), `connect-src` (Radio Browser, HamQTH, CelesTrak, GoatCounter). Imágenes y audio admiten cualquier `https:` (teselas, KC2G, emisoras, Commons). Ver [ARQUITECTURA.md §11](ARQUITECTURA.md#11-seguridad).

## Datos guardados en el repositorio

| Archivo | Origen | Fecha | Cómo actualizar |
| --- | --- | --- | --- |
| `js/exam-data.js` | Escrito a partir del anexo II de la [Orden IET/1311/2013](https://boe.es/boe/dias/2013/07/12/pdfs/BOE-A-2013-7624.pdf) | 1 nov 2026 | [CONTENIDO.md](CONTENIDO.md#preguntas-del-examen) |
| `js/clubs-data.js` | [URE · secciones](https://www.ure.es/secciones/) (solo datos públicos) | 1 nov 2026 | [CONTENIDO.md](CONTENIDO.md#radioclubes) |
| Cifras del trámite (`empezar/`) | [URE · obtener autorización](https://www.ure.es/obtener-autorizacion/) (página actualizada en septiembre de 2026) y la Orden IET/1311/2013 | 1 nov 2026 | Revisar una vez al año |
| Bandas (`js/data.js`) | Planes de banda IARU Región 1, aproximados | 1 nov 2026 | Si cambia la normativa |
| CB-27 y PMR446 (`empezar/#cb27`) | [Ministerio: uso común del espectro](https://digital.gob.es/telecomunicaciones-infraestructuras-digitales/areas-interes/espectro-radioelectrico/informacion-general/uso-espectro-radioelectrico/comun) y [Orden IET/614/2015](https://www.boe.es/buscar/doc.php?id=BOE-A-2015-3864) (nota UN-3 del CNAF); PMR446 según la decisión ECC (15)05 | 1 nov 2026 | Si cambia el CNAF |
| Qué radio comprar (`empezar/#equipo`) | Comparativas de [Electronics Notes](https://www.electronics-notes.com/store-shop/ham-radio-reviews/baofeng-uv5r-vs-quansheng-uvk5-vs-tidradio-tdh3.php) y [OneSDR](https://www.onesdr.com/the-worlds-most-popular-cheap-radio-is-illegal/); precios orientativos | 1 nov 2026 | Revisar modelos y precios cada seis meses |
| Grabaciones (`js/data.js`, `RECORDINGS`) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Audio_files_of_amateur_radio): licencia y autor de cada archivo | 1 nov 2026 | [CONTENIDO.md](CONTENIDO.md#grabaciones-reales) |
| Calendario (`js/clubs.js`) | Reglas habituales de cada evento | — | Se calcula solo; revisar las reglas si un organizador las cambia |
