# 📻 radio

Web de iniciación a la radioafición en español: de "¿qué es esto?" a tu indicativo. Para quien no ha tocado nunca una radio.

**Web:** https://bendi.dev/radio

## Qué tiene

**Tu ruta**
- **Tu primer mes**: 4 semanas y 14 pasos que se marcan solos al usar la web, con insignias por semana.

**Escuchar**
- **Mapa de emisoras** de todo el mundo con reproductor.
- **Escucha guiada**: el receptor web de Twente ya sintonizado según la hora.
- **Ahora en el aire**: mapa en directo de quién oye a quién, contado en español.
- **¿Qué es este sonido?**: ocho sonidos típicos generados en el navegador con su cascada en directo.

**Entender**
- **Cómo funciona la radio**: cuatro lecciones interactivas (onda, antena, ionosfera y modos) en tres niveles, con preguntas.
- **Bandas**, **propagación en lenguaje llano** con datos solares en directo y el mapa de la ionosfera.
- **Pases de la ISS** sobre tu ciudad.
- **Glosario emergente**: la jerga se explica al pasar el ratón.

**Practicar**
- **Entrenador de Morse** con método Koch y traductor.
- **Contactos simulados**: primer contacto, concurso, parque POTA, red de emergencia y la ISS, con tarjeta QSL descargable.
- **Simulador del examen** con tarjetas adaptativas, explicaciones, dominio por tema y simulacro de dos partes.

**Dar el salto**
- **El trámite en cifras** y lista de comprobación de cero a indicativo.
- **Encuentra tu radioclub**: las secciones de la URE por provincia y el calendario de citas del año.
- **¿Es para mí?**, costes, guía para familias y referencias de Hispanoamérica.

Todo el progreso (ruta, examen, Morse, lecciones) se guarda solo en el navegador de cada persona. No hay registro ni cookies.

## Datos y servicios

| Qué | De dónde |
| --- | --- |
| Emisoras | [Radio Browser](https://www.radio-browser.info) |
| Avisos en directo y datos solares | [HamQTH.com](https://www.hamqth.com/developers.php) |
| Mapa de la ionosfera | [KC2G](https://prop.kc2g.com/) |
| Órbita de la ISS | [CelesTrak](https://celestrak.org/) con [satellite.js](https://github.com/shashwatak/satellite-js) |
| Mapas | [Leaflet](https://leafletjs.com) con el mapa base gris oscuro de Esri |
| Receptor web | [WebSDR de la Universidad de Twente](http://websdr.ewi.utwente.nl:8901/) |
| Secciones de radioclub | [URE](https://www.ure.es/secciones/): solo nombre, provincia, indicativo y web de cada sección |
| Preguntas de examen | Escritas a partir del temario de la [Orden IET/1311/2013](https://boe.es/boe/dias/2013/07/12/pdfs/BOE-A-2013-7624.pdf) |
| Visitas | [GoatCounter](https://www.goatcounter.com/), sin cookies |

## Estructura

```
index.html
css/style.css
js/data.js         bandas, jerga, alfabeto, FAQ y presets de escucha
js/journey.js      Tu primer mes
js/stations.js     mapa de emisoras
js/morse.js        codificación y sonido Morse
js/koch.js         entrenador Koch
js/qso.js          contactos simulados y QSL
js/exam-data.js    banco de preguntas
js/exam.js         simulador del examen
js/sounds.js       galería de sonidos y cascada
js/lessons.js      lecciones interactivas
js/propagation.js  propagación en directo
js/live.js         Ahora en el aire
js/iss.js          pases de la ISS
js/clubs-data.js   secciones de la URE
js/clubs.js        radioclubes y calendario
js/family.js       autotest ¿Es para mí?
js/app.js          dial, bandas, traductores, compartir, FAQ
js/glossary.js     glosario emergente (se carga el último)
```

## Desarrollo

Se trabaja en la rama `development` y los cambios llegan a `main` mediante pull request. Para probar en local basta con servir la carpeta:

```bash
python3 -m http.server 8000
```

73!
