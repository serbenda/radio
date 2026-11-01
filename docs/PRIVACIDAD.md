# Privacidad

La web no pide registro, no usa cookies y no tiene servidor propio que guarde nada sobre quien la visita.

## Lo que se guarda en tu navegador

Solo en `localStorage` de tu navegador, para que tu progreso siga ahí la próxima vez. Nunca se envía a ningún sitio.

| Clave | Qué guarda | Cómo se borra |
| --- | --- | --- |
| `radio.journey` | Fecha de inicio de "Tu primer mes", logros e insignias | Botón "Empezar de cero" en la portada |
| `radio.lessons` | Lecciones completadas | Borrando los datos del sitio |
| `radio.koch` | Nivel de Morse, aciertos recientes por letra y racha | Borrando los datos del sitio |
| `radio.exam` | Progreso de cada pregunta y mejor simulacro | Borrando los datos del sitio |
| `radio.checklist` | Pasos marcados del trámite | Desmarcándolos o borrando los datos del sitio |

En modo privado o con el almacenamiento bloqueado la web funciona igual, pero no recuerda nada (`Radio.store` captura el error).

## Ubicación

Se usa en dos sitios, **solo si pulsas el botón** y con el permiso del navegador:

- **Pases de la ISS** ("Usar mi ubicación"): para calcular cuándo pasa sobre ti.
- **Radioclubes** ("La más cercana"): para elegir tu provincia.

En los dos casos el cálculo se hace en tu navegador y la ubicación **no se envía a ningún sitio** ni se guarda.

## Tus datos en el simulador de contactos

El nombre, la ciudad y el indicativo de prácticas que escribes en "Haz tu primer contacto" solo se usan en tu pantalla y en la tarjeta QSL que generas. No se guardan ni se envían. La voz de la otra estación la genera tu propio navegador.

## Peticiones a otros servidores

Al visitar la web, tu navegador se conecta a servicios de terceros, que como cualquier servidor ven tu dirección IP:

- **Siempre:** Google Fonts (tipografías), cdnjs (librerías), GoatCounter (visitas).
- **Según la página:** Radio Browser, HamQTH, KC2G, CelesTrak y Esri. La lista completa está en [DATOS.md](DATOS.md).
- **Al reproducir una emisora**, el audio viene directamente del servidor de esa emisora.

## Visitas

Las visitas se cuentan con [GoatCounter](https://www.goatcounter.com/), que no usa cookies ni guarda datos personales. Sirve para saber qué páginas se usan; los datos se ven en el panel de visitas de bendi.dev.

## Datos de terceros publicados en la web

La sección "Encuentra tu radioclub" usa la lista pública de secciones de la URE. La web de la URE muestra también el nombre, el teléfono y el correo de quien preside cada sección: **esos datos personales no se copian nunca**. Solo se publica el nombre de la sección, su provincia, su indicativo y su web. `tools/check.mjs` falla si aparece algo parecido a un correo, un teléfono o un cargo.
