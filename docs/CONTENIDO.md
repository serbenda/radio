# Cómo añadir y actualizar contenido

Guía práctica para ampliar la web sin romper nada. Después de cualquier cambio, ejecuta:

```bash
node tools/check.mjs
```

## Estilo de los textos

- **Para quien nunca ha tocado una radio.** Si usas jerga, explícala en la misma frase o añádela al glosario.
- **Español de España**, frases cortas (menos de 25 palabras), voz activa y tuteo.
- **Cifras concretas** con su unidad: "7,1 MHz", "unos 20 metros", "23,67 €".
- **Cita la fuente** de cualquier dato oficial (normativa, tasas, fechas) y anota la fecha en que lo comprobaste.
- **Nada de datos personales** de terceros (nombres, teléfonos, correos), aunque estén publicados en otra web.

## Preguntas del examen

Archivo: `js/exam-data.js`. Cada pregunta:

```js
{ id: 'e9', p: 1, t: 'Electricidad', q: 'Enunciado…', a: ['Correcta', 'Distractor', 'Distractor', 'Distractor'], ok: 0, why: 'Explicación con el cálculo o el artículo.' },
```

- **`id` único y estable.** No reutilices ni cambies ids: el progreso de cada persona se guarda por id.
- **`p`**: `1` Electricidad y radioelectricidad, `2` Normativa y operación.
- **`t`**: usa un tema existente (Electricidad, Componentes, Equipos, Antenas, Propagación, Seguridad y medidas, Normativa, Operación) o crea uno nuevo: aparecerá solo en el panel.
- **`a`**: de 3 a 4 opciones distintas. El orden da igual: se barajan al mostrarse.
- **`why`**: obligatorio. Explica por qué es la correcta; en normativa, cita el artículo.
- **Normativa:** comprueba cada pregunta con el texto de la [Orden IET/1311/2013](https://boe.es/boe/dias/2013/07/12/pdfs/BOE-A-2013-7624.pdf) y sus modificaciones.
- Cada parte necesita **al menos 30 preguntas** para el simulacro.

Recomendado: que un radioaficionado con licencia revise las preguntas nuevas antes de publicarlas.

## Bandas

Archivo: `js/data.js`, lista `BANDS`, **ordenadas de menor a mayor frecuencia**. `kind` es `hf`, `vhf` o `uhf`. Las de tipo `hf` aparecen también en el dial de la portada.

## Escucha guiada

Archivo: `js/data.js`, lista `LISTEN`:

```js
{ id: 'voz40', title: 'Voces en 40 m', tune: '7150lsb', chip: '🗣️ Voces 40 m', best: 'night', text: 'Qué vas a oír.' },
```

- `tune`: kilohercios + modo (`lsb`, `usb`, `cw` o `am`), sin espacios.
- `best`: `day`, `night` o `any`. Debe haber una de `day` y otra de `night`: son las que se recomiendan según la hora.

Receptores alternativos: lista `RECEIVERS` del mismo archivo.

## Sonidos

Archivo: `js/sounds.js`.

1. Añade la ficha a `SOUNDS` (`id`, `icon`, `name`, `tune` para buscarlo en el receptor, `what` qué es, `look` cómo se ve en la cascada).
2. Añade su sintetizador en `SYNTH` con el mismo `id`. Recibe el instante de inicio y devuelve el instante final. Usa las ayudas `tone()`, `noise()` y `keyer()`.

## Lecciones

Archivo: `js/lessons.js`.

1. Añade la lección a `LESSONS`: `id`, `title`, `icon`, tres textos en `levels` (curioso, interesado, técnico) y tres preguntas en `quiz`.
2. Añade su dibujo en `STAGES` con el mismo `id`: recibe el contenedor y devuelve una función para parar (o `null` si no anima). Si anima, usa `animate()` para que solo corra en pantalla, y acompáñalo de un texto `.lesson-readout` con `aria-live="polite"` que diga lo que muestra.

## Contactos simulados

Archivo: `js/qso.js`.

1. Añade la opción al `<select id="qsoScenario">` de `practicar/index.html`.
2. Escribe una función `runMiEscenario()` siguiendo las existentes: `add('info', …)` para narrar, `receive(texto)` para lo que dice la otra estación y `await choose([...])` con tres opciones (una correcta). Cada opción lleva su `why`.
3. Termina con `finish(texto, conQSL)`.
4. Prepara la estación, la banda y la frecuencia en `start()` y registra la función en el objeto que elige el escenario.

## Glosario emergente

Archivo: `js/glossary.js`, lista `TERMS`: `['término', 'definición']`. Añade `'i'` como tercer elemento para que no distinga mayúsculas. Evita términos ambiguos (por ejemplo "USB" puede ser la banda lateral o el conector).

## "Tu primer mes"

Archivo: `js/journey.js`, lista `WEEKS`. Cada paso tiene `text`, `href` (ruta desde la raíz, por ejemplo `escuchar/#ahora`), `done()` y, opcionalmente, `prog()` para mostrar "2/3".

Regla: **un paso solo cuenta si la persona hace algo** (pulsar, escuchar, responder), no por llegar a la sección. `tools/check.mjs` comprueba que cada `href` existe.

## Radioclubes

Archivo: `js/clubs-data.js`. Formato: `[provincia, nombre, indicativo, web]`.

Cómo se obtuvo (1 de noviembre de 2026), por si hay que repetirlo:

1. La página [ure.es/secciones](https://www.ure.es/secciones/) carga las secciones de una provincia al enviar su formulario (`POST` con el campo `provincia`).
2. Se recorrió cada provincia del desplegable, despacio (una petición cada 250 ms), y de cada sección se tomó **solo**: nombre, indicativo de la sección (campo "Indicativo sección") y web (campo "Web"). Se descartaron webs genéricas (la portada de la URE o de QRZ).
3. **No se copian** nombres de presidentes, teléfonos, correos ni direcciones.

Revisión recomendada: cada seis meses.

## Calendario de eventos

Archivo: `js/clubs.js`, lista `RULES`. Cada evento se define por su regla, no por su fecha:

- `pick: w => w.at(-1)`: último fin de semana completo del mes (`m`, de 0 a 11).
- `pick: w => w[0]`, `w[1]`, `w[2]`: primero, segundo y tercero.
- `day: 18`: día fijo.
- `all: true`: todo el mes.

Si un organizador cambia la regla, cámbiala aquí.

## Trámite y cifras

En `empezar/index.html`, bloque "El trámite en cifras". Fuentes: [URE · obtener autorización](https://www.ure.es/obtener-autorizacion/) y la Orden IET/1311/2013. Revisa las tasas una vez al año.

## Preguntas frecuentes

Archivo: `js/data.js`, lista `FAQ`: `['Pregunta', 'Respuesta']`.
