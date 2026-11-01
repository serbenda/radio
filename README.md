# 📻 radio

Web de iniciación a la radioafición para quien no ha tocado nunca una radio: escuchar, entender lo que se oye y dar los primeros pasos hacia la licencia.

**Web:** https://bendi.dev/radio

## Qué tiene

- **Dial interactivo**: recorre la onda corta y te dice qué banda es y cómo se comporta a esta hora.
- **Mapa de emisoras**: miles de emisoras reales en un mapa, con reproductor, buscador por estilo o nombre y botón “Sorpréndeme”.
- **Receptores en directo**: acceso a WebSDR, KiwiSDR, PSK Reporter y radio en la Estación Espacial.
- **Bandas**: de 160 m a 70 cm, con rangos y cuándo se oye cada una.
- **Propagación**: estado solar y de bandas en tiempo real, y cómo interpretarlo.
- **Morse**: traductor con sonido y juego de oído que va añadiendo letras (método Koch).
- **Jerga**: deletreo con el alfabeto fonético internacional y glosario de códigos Q.
- **Cómo empezar en España**: pasos hasta el indicativo, primer equipo, radioclubes y URE.
- **Emergencias**, **mini test** de iniciación y **preguntas frecuentes**.
- Reloj UTC en la cabecera, como en cualquier cuarto de radio.

## Tecnología

HTML, CSS y JavaScript sin dependencias de compilación, publicado con GitHub Pages.

- Mapa: [Leaflet](https://leafletjs.com) con teselas de OpenStreetMap / CARTO.
- Emisoras: API abierta de [Radio Browser](https://www.radio-browser.info).
- Propagación: panel de [HamQSL](https://www.hamqsl.com/solar.html).
- Morse: generado en el navegador con Web Audio.

## Estructura

```
index.html
css/style.css
js/data.js       # bandas, jerga, test y FAQ
js/stations.js   # mapa y reproductor de emisoras
js/morse.js      # codificación y sonido Morse
js/app.js        # dial, bandas, juegos y resto de interacciones
```

## Desarrollo

Se trabaja en la rama `development` y los cambios llegan a `main` mediante pull request. Para probar en local basta con servir la carpeta:

```bash
python3 -m http.server 8000
```

73!
