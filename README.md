# 📻 radio

Web de iniciación a la radioafición en español: de "¿qué es esto?" a tu indicativo. Para quien no ha tocado nunca una radio.

**Web:** https://bendi.dev/radio

[![Comprobaciones](https://github.com/serbenda/radio/actions/workflows/comprobaciones.yml/badge.svg)](https://github.com/serbenda/radio/actions/workflows/comprobaciones.yml)

## Qué es

Una web estática, sin registro ni cookies, que acompaña a un novato en cinco pasos:

| Paso | Página | Qué hay |
| --- | --- | --- |
| — | [Inicio](https://bendi.dev/radio/) | Dial de onda corta, qué es la radioafición y **Tu primer mes**: 4 semanas, 14 pasos que se marcan solos e insignias |
| 1 | [Escuchar](https://bendi.dev/radio/escuchar/) | Mapa de emisoras con reproductor, escucha guiada en un receptor real, **Ahora en el aire** (quién habla con quién, en directo) **¿Qué es este sonido?** con cascada y grabaciones reales |
| 2 | [Entender](https://bendi.dev/radio/entender/) | Cuatro lecciones interactivas en tres niveles, bandas, propagación de hoy en lenguaje llano y pases de la ISS sobre tu ciudad |
| 3 | [Practicar](https://bendi.dev/radio/practicar/) | Entrenador de Morse con método Koch, alfabeto fonético y jerga, y cinco contactos simulados con tarjeta QSL |
| 4 | [Examen](https://bendi.dev/radio/examen/) | Simulador del examen español con tarjetas adaptativas, explicaciones y simulacro de dos partes |
| 5 | [Empezar](https://bendi.dev/radio/empezar/) | El trámite en cifras, lista de comprobación, radioclubes de la URE por provincia, calendario, familias e Hispanoamérica |

Todo el progreso se guarda solo en el navegador de cada persona (y se puede guardar en un archivo). Se puede instalar en el móvil y funciona sin conexión.

## Probar en local

```bash
python3 -m http.server 8000      # y abre http://localhost:8000/
node tools/check.mjs             # comprobaciones automáticas
```

No hay nada que instalar ni que compilar: lo que hay en el repositorio es lo que se publica.

## Estructura

```
index.html                 Inicio
escuchar/index.html        Paso 1
entender/index.html        Paso 2
practicar/index.html       Paso 3
examen/index.html          Paso 4
empezar/index.html         Paso 5
404.html                   Página de error
offline.html               Lo que se ve sin conexión en una página no visitada
sw.js                      Service worker: instalable y sin conexión
manifest.webmanifest       Datos para instalar la web
img/                       Iconos de la web instalada
css/style.css              Estilos de todas las páginas
js/                        Un módulo por funcionalidad (ver docs/MODULOS.md)
  core.js                  Núcleo común: objeto Radio (va el primero)
  data.js                  Contenido estático compartido
  journey.js               Tu primer mes (en todas las páginas)
  glossary.js              Glosario emergente (va el último)
  …                        Resto de módulos
og.png                     Imagen para compartir (1200 × 630)
sitemap.xml                Mapa del sitio
tools/check.mjs            Comprobaciones automáticas
.github/workflows/         GitHub Actions: comprobaciones en cada PR
.github/ISSUE_TEMPLATE/    Formularios para avisar de errores
docs/                      Documentación
```

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Cómo está montada: páginas, orden de carga, núcleo `Radio`, eventos, almacenamiento |
| [docs/MODULOS.md](docs/MODULOS.md) | Referencia de cada archivo de `js/`, convenciones y cómo añadir un módulo |
| [docs/DATOS.md](docs/DATOS.md) | Servicios externos: endpoints, límites, atribución, qué pasa si fallan |
| [docs/CONTENIDO.md](docs/CONTENIDO.md) | Cómo añadir preguntas, sonidos, lecciones, contactos, términos, radioclubes… |
| [docs/PRIVACIDAD.md](docs/PRIVACIDAD.md) | Qué se guarda, ubicación, peticiones a terceros y datos personales |
| [docs/CALIDAD.md](docs/CALIDAD.md) | Accesibilidad, rendimiento, seguridad, SEO y limitaciones conocidas |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Comprobaciones automáticas y lista de pruebas manuales |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Registro de decisiones de diseño y por qué |
| [docs/ESTUDIO.md](docs/ESTUDIO.md) | Resumen del estudio de webs de radioafición que guía el proyecto |
| [CHANGELOG.md](CHANGELOG.md) | Historial de versiones |

## Datos y servicios

| Qué | De dónde |
| --- | --- |
| Emisoras | [Radio Browser](https://www.radio-browser.info) |
| Avisos en directo y datos solares | [HamQTH.com](https://www.hamqth.com/developers.php) |
| Mapa de la ionosfera | [KC2G](https://prop.kc2g.com/) |
| Órbita de la ISS | [CelesTrak](https://celestrak.org/) con [satellite.js](https://github.com/shashwatak/satellite-js) |
| Mapas | [Leaflet](https://leafletjs.com) con el mapa base gris oscuro de Esri |
| Receptor web | [WebSDR de la Universidad de Twente](http://websdr.ewi.utwente.nl:8901/) |
| Secciones de radioclub | [URE](https://www.ure.es/secciones/): solo nombre, provincia, indicativo y web |
| Preguntas de examen | Escritas a partir de la [Orden IET/1311/2013](https://boe.es/boe/dias/2013/07/12/pdfs/BOE-A-2013-7624.pdf) |
| Visitas | [GoatCounter](https://www.goatcounter.com/), sin cookies |

Detalle completo en [docs/DATOS.md](docs/DATOS.md).

## Flujo de trabajo

1. Se trabaja en la rama `development`.
2. Antes de subir: `node tools/check.mjs` sin fallos y la lista manual de [docs/PRUEBAS.md](docs/PRUEBAS.md).
3. Los cambios llegan a `main` con una pull request; GitHub Actions ejecuta las comprobaciones.
4. Al fusionar, GitHub Pages publica `main` en bendi.dev/radio en uno o dos minutos.
5. Cada versión se anota en [CHANGELOG.md](CHANGELOG.md).

73!
