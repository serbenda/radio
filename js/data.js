/**
 * data.js · Contenido estático compartido (sin lógica). Se carga en todas las páginas, justo después de core.js.
 *
 * Son constantes globales (const en el ámbito del script), así que cualquier módulo cargado después
 * puede leerlas por su nombre. No hay que exportar nada: basta con que la página cargue este archivo.
 *
 *  BANDS        Bandas de radioaficionado (IARU Región 1, aproximadas): nombre, MHz, tipo, cuándo funciona y texto (bands.js).
 *  DIAL_BANDS   Las bandas de onda corta de BANDS, para el dial de la portada (dial.js).
 *  PHONETIC     Alfabeto fonético internacional y números (jargon.js, qso.js).
 *  GLOSSARY     Jerga básica para la lista de "Habla como un radioaficionado" (jargon.js).
 *  FAQ          Preguntas frecuentes [pregunta, respuesta] (faq.js).
 *  WEBSDR       URL base del WebSDR de Twente con ?tune= (guided.js).
 *  LISTEN       Presets de la escucha guiada: tune = "<kHz><modo>", best = day | night | any (guided.js).
 *  RECEIVERS    Receptores web alternativos (guided.js).
 *  COMMONS      URL base de los archivos de Wikimedia Commons (solo para construir RECORDINGS).
 *  RECORDINGS   Grabaciones reales con licencia libre (recordings.js).
 *
 * Fuentes y fechas de estos datos: docs/DATOS.md ("Datos guardados en el repositorio").
 *
 * Cómo modificarlo:
 *  - Añadir o corregir contenido: sigue docs/CONTENIDO.md. Cada constante tiene encima la forma exacta de sus entradas.
 *  - Textos en español de España, frases cortas; la jerga nueva se explica sola si está en TERMS de glossary.js.
 *  - Los textos visibles van en los dos idiomas con t('castellano', 'English') (Radio.t, ver docs/IDIOMAS.md);
 *    lo que no es texto (frecuencias, ids, tune, URL, indicativos) se escribe una sola vez.
 *  - Después de tocar algo, ejecuta `node tools/check.mjs`: valida que BANDS esté ordenada
 *    (cada `from` < `to` y cada banda empieza después de la anterior) y que cada `tune` de LISTEN
 *    tenga el formato "<kHz><lsb|usb|cw|am>".
 *  - Si añades una constante nueva, documéntala en esta cabecera y en docs/MODULOS.md.
 */

// t(es, en): texto del idioma de la página (Radio.t de core.js). Si Radio no existe (p. ej. al ejecutar
// este archivo en tools/check.mjs, sin navegador), devuelve el castellano.
const { t } = typeof Radio !== 'undefined' ? Radio : { t: es => es };

/* ---------- Bandas ---------- */

/**
 * Bandas de radioaficionado, de la más baja a la más alta (el orden importa: dial.js y check.mjs lo dan por hecho).
 * Cada entrada:
 *  - name {string}  Nombre por longitud de onda, con espacio antes de la unidad: '40 m', '70 cm'.
 *                   dial.js compara algunos nombres literalmente ('160 m', '12 m'…), así que no los cambies sin revisarlo.
 *  - from {number}  Inicio de la banda en MHz.
 *  - to   {number}  Fin de la banda en MHz (mayor que from).
 *  - kind {'hf'|'vhf'|'uhf'}  Tipo: 'hf' = onda corta (3-30 MHz; aquí también 160 m, que está algo por debajo).
 *                   Solo las 'hf' salen en el dial. También es la clase CSS del botón en bands.js.
 *  - when {string}  Cuándo suele funcionar, en pocas palabras (se muestra como "Mejor momento").
 *  - text {string}  Explicación para principiantes (una o dos frases).
 * Para añadir una banda: insértala en su sitio por frecuencia y ejecuta tools/check.mjs.
 */
const BANDS = [
  { name: '160 m', from: 1.81, to: 2.0, kind: 'hf', when: t('Noche de invierno', 'Winter nights'),
    text: t('La “banda de los pacientes”. Necesita antenas enormes y solo funciona de noche, pero un contacto transatlántico aquí es un trofeo.',
      'The “band for patient people”. It needs huge aerials and only works at night, but a transatlantic contact here is a real trophy.') },
  { name: '80 m', from: 3.5, to: 3.8, kind: 'hf', when: t('Noche', 'Night'),
    text: t('Charlas nocturnas entre radioaficionados de toda España y países vecinos. Mucho ruido en verano por las tormentas.',
      'Night-time chats between radio amateurs across Spain and neighbouring countries. Lots of noise in summer because of thunderstorms.') },
  { name: '40 m', from: 7.0, to: 7.2, kind: 'hf', when: t('Tarde y noche', 'Evening and night'),
    text: t('La banda más animada para empezar a escuchar. De día cubre la península; de noche, toda Europa y más allá.',
      'The liveliest band to start listening on. By day it covers the Iberian Peninsula; at night, all of Europe and beyond.') },
  { name: '30 m', from: 10.1, to: 10.15, kind: 'hf', when: t('Todo el día', 'All day'),
    text: t('Banda estrecha y tranquila: solo Morse y modos digitales. Sin concursos, sin voz.',
      'A narrow, quiet band: Morse and digital modes only. No contests, no voice.') },
  { name: '20 m', from: 14.0, to: 14.35, kind: 'hf', when: t('De día', 'Daytime'),
    text: t('La reina del DX (contactos lejanos). Abierta casi siempre a algún sitio del mundo mientras haya sol.',
      'The queen of DX (long-distance contacts). Almost always open to somewhere in the world while the sun is up.') },
  { name: '17 m', from: 18.068, to: 18.168, kind: 'hf', when: t('De día', 'Daytime'),
    text: t('Como la de 20 m pero con menos gente. Muy agradable cuando el Sol está activo.',
      'Like 20 m but less crowded. Very pleasant when the Sun is active.') },
  { name: '15 m', from: 21.0, to: 21.45, kind: 'hf', when: t('De día, sol activo', 'Daytime, active Sun'),
    text: t('Con buena actividad solar llegas a Sudamérica, África o Asia con muy poca potencia.',
      'With good solar activity you can reach South America, Africa or Asia with very little power.') },
  { name: '12 m', from: 24.89, to: 24.99, kind: 'hf', when: t('De día, sol activo', 'Daytime, active Sun'),
    text: t('Pequeña y caprichosa. Cuando se abre, sorprende.',
      'Small and unpredictable. When it opens, it surprises you.') },
  { name: '10 m', from: 28.0, to: 29.7, kind: 'hf', when: t('Máximo solar', 'Solar maximum'),
    text: t('En los años buenos del ciclo solar, un walkie de 5 vatios da la vuelta al mundo. En los malos, silencio.',
      'In the good years of the solar cycle, a 5-watt handheld can reach round the world. In the bad years, silence.') },
  { name: '6 m', from: 50.0, to: 52.0, kind: 'vhf', when: t('Verano', 'Summer'),
    text: t('La “banda mágica”: casi siempre cerrada, pero en verano tiene aperturas repentinas por la esporádica E.',
      'The “magic band”: closed most of the time, but in summer it opens suddenly thanks to sporadic E.') },
  { name: '2 m', from: 144.0, to: 146.0, kind: 'vhf', when: t('Siempre (local)', 'Always (local)'),
    text: t('La banda de los walkies y los repetidores. Contactos locales y con la Estación Espacial Internacional.',
      'The band for handhelds and repeaters. Local contacts, and contacts with the International Space Station.') },
  { name: '70 cm', from: 430.0, to: 440.0, kind: 'uhf', when: t('Siempre (local)', 'Always (local)'),
    text: t('Repetidores, modos digitales de voz y satélites de radioaficionado. Antenas pequeñas, alcance de ciudad.',
      'Repeaters, digital voice modes and amateur satellites. Small aerials, city-wide range.') },
];

// Bandas que recorre el dial del hero (onda corta)
// Se calcula a partir de BANDS: no hay que mantenerla a mano. Misma forma que BANDS.
const DIAL_BANDS = BANDS.filter(b => b.kind === 'hf');

/* ---------- Jerga ---------- */

/**
 * Alfabeto fonético internacional (OACI/OTAN) y cifras en el idioma de la página (t()).
 * Forma: { carácter en mayúsculas: 'palabra' }. Claves A-Z y '0'-'9'.
 * Se busca con el carácter ya en mayúsculas. Un carácter que no esté aquí lo omite jargon.js y lo deja
 * tal cual qso.js (al deletrear indicativos).
 */
const PHONETIC = {
  A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
  H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
  O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
  V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
  '0': t('Cero', 'Zero'), '1': t('Uno', 'One'), '2': t('Dos', 'Two'), '3': t('Tres', 'Three'), '4': t('Cuatro', 'Four'), '5': t('Cinco', 'Five'),
  '6': t('Seis', 'Six'), '7': t('Siete', 'Seven'), '8': t('Ocho', 'Eight'), '9': t('Nueve', 'Nine'),
};

/**
 * Glosario de la lista "Habla como un radioaficionado" (jargon.js).
 * Forma: [término, definición]. Se muestra en este mismo orden. jargon.js lo mete en innerHTML SIN escapar
 * (es contenido propio), así que admite HTML sencillo como <b>, pero un "<" suelto rompería la lista.
 * Ojo: no es el glosario emergente; ese está en TERMS dentro de glossary.js (con otra forma).
 */
const GLOSSARY = [
  ['CQ', t('Llamada general: “¿hay alguien que quiera hablar?”.', 'General call: “is anyone there who wants to talk?”.')],
  ['QSO', t('Un contacto o conversación por radio.', 'A radio contact or conversation.')],
  ['QTH', t('Tu localización. “Mi QTH es Madrid”.', 'Your location. “My QTH is Madrid”.')],
  ['QRZ?', t('¿Quién me llama?', 'Who is calling me?')],
  ['QSL', t('Recibido. También la tarjeta postal que se intercambia para confirmar un contacto.', 'Received. Also the postcard that is exchanged to confirm a contact.')],
  ['QRM / QRN', t('Interferencias de otras estaciones / ruido atmosférico.', 'Interference from other stations / atmospheric noise.')],
  ['QRP', t('Emitir con muy poca potencia (5 W o menos). Todo un deporte.', 'Transmitting with very low power (5 W or less). A sport in itself.')],
  ['DX', t('Contacto a larga distancia o con un país raro.', 'A long-distance contact, or one with a rare country.')],
  ['73', t('Saludos cordiales. Así se despide todo el mundo.', 'Best regards. It is how everyone says goodbye.')],
  [t('Indicativo', 'Callsign'), t('Tu “nombre” oficial en el aire. En España empiezan por EA, EB, EC… y un número de zona.', 'Your official “name” on the air. In Spain they start with EA, EB, EC… plus a region number.')],
];

/* ---------- Preguntas frecuentes ---------- */

/**
 * Preguntas frecuentes (faq.js). Forma: [pregunta, respuesta], ambos texto plano.
 * Para añadir una: nueva fila en el orden en que deba salir. Si da cifras o normativa, anota la fuente en docs/DATOS.md.
 */
const FAQ = [
  [t('¿Es caro?', 'Is it expensive?'),
    t('Para escuchar te basta con el navegador o un SDR de unos 35 €. Un walkie para empezar con licencia cuesta menos que unas zapatillas. Luego puedes gastar lo que quieras, como en cualquier hobby.',
      'To listen, all you need is your browser or an SDR costing about €35. A handheld to start with once you have a licence costs less than a pair of trainers. After that you can spend as much as you like, as with any hobby.')],
  [t('¿Tengo que saber Morse?', 'Do I have to know Morse?'),
    t('No. Hace años que no es obligatorio. Mucha gente lo aprende después porque engancha y porque llega más lejos con menos potencia.',
      'No. It has not been compulsory for years. Many people learn it later because it is addictive and because it gets further with less power.')],
  [t('¿Es muy difícil el examen?', 'Is the exam very hard?'),
    t('Es asequible estudiando unas semanas. Hay electricidad básica, radio, normativa y operación. Los radioclubes suelen dar cursos de preparación.',
      'It is manageable with a few weeks of study. It covers basic electricity, radio, regulations and operating. Radio clubs often run preparation courses.')],
  [t('¿Es legal escuchar?', 'Is it legal to listen?'),
    t('Escuchar las bandas de radioaficionado es libre. Para emitir necesitas la autorización y tu indicativo.',
      'Listening to the amateur bands is open to everyone. To transmit you need a licence and your own callsign.')],
  [t('¿Es cosa de mayores?', 'Is it just for older people?'),
    t('Hay mucha gente veterana, sí, pero también grupos juveniles muy activos (busca “YOTA”, Youngsters On The Air), satélites, drones, electrónica, programación de SDR… Es un hobby muy técnico y muy actual.',
      'There are plenty of veterans, yes, but also very active youth groups (look up “YOTA”, Youngsters On The Air), satellites, drones, electronics, SDR programming… It is a very technical and very modern hobby.')],
  [t('¿Puedo usar una Baofeng sin licencia?', 'Can I use a Baofeng without a licence?'),
    t('Para escuchar, sí. Para transmitir, no: solo con licencia de radioaficionado y en las bandas de radioaficionado. No es un walkie PMR446 de uso libre, aunque pueda sintonizar esas frecuencias.',
      'To listen, yes. To transmit, no: only with an amateur radio licence and on the amateur bands. It is not a licence-free PMR446 walkie-talkie, even though it can tune to those frequencies.')],
  [t('¿Y la CB-27? ¿Necesita licencia?', 'What about CB-27? Does it need a licence?'),
    t('No. Desde 2015 la Banda Ciudadana es de uso común en España: basta un equipo homologado y respetar sus límites (40 canales, 4 W en FM y AM, 12 W en BLU).',
      'No. Since 2015 Citizens Band has been licence-free in Spain: you just need approved equipment and to respect its limits (40 channels, 4 W on FM and AM, 12 W on SSB).')],
  [t('¿Mis vecinos van a oírme en la tele?', 'Will my neighbours hear me on their TV?'),
    t('Con un equipo moderno, bien instalado y con potencias razonables, es muy raro. Parte del examen trata justo de evitar interferencias.',
      'With modern equipment, properly installed and at sensible power, it is very rare. Part of the exam is precisely about avoiding interference.')],
  [t('¿Dónde encuentro gente?', 'Where do I find people?'),
    t('En los radioclubes y secciones locales de la URE, en las redes (charlas programadas) de los repetidores de tu zona y en los mercadillos de radio, que son un planazo.',
      'At radio clubs and local URE sections, on the nets (scheduled chats) of your local repeaters, and at radio rallies, which are a great day out.')],
];

/* ---------- Escucha guiada en un receptor web ---------- */

// Escucha guiada en el WebSDR de la Universidad de Twente (?tune=<kHz><modo>)
// Es HTTP, pero solo se enlaza en otra pestaña (no se incrusta), así que no hay contenido mixto.
// live.js y sounds.js tienen su propia copia de esta URL: si cambia, cámbiala también allí.
const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';
/**
 * Presets de la escucha guiada (guided.js). Cada entrada:
 *  - id    {string}  Identificador único, sin espacios (se usa en data-id del botón).
 *  - title {string}  Título que se muestra al elegirlo.
 *  - tune  {string}  Frecuencia en kHz seguida del modo: lsb | usb | cw | am (p. ej. '7150lsb').
 *                    Convención de radioaficionado: lsb por debajo de 10 MHz, usb por encima. check.mjs valida el formato.
 *  - chip  {string}  Texto corto del botón (puede llevar un emoji delante).
 *  - best  {'day'|'night'|'any'}  Cuándo es la mejor opción. guided.js recomienda la PRIMERA entrada con
 *                    'day' de día y la primera con 'night' de noche, así que debe haber al menos una de cada.
 *  - text  {string}  Qué se va a oír y qué hacer, en una o dos frases.
 */
const LISTEN = [
  { id: 'voz40', title: t('Voces en 40 m', 'Voices on 40 m'), tune: '7150lsb', chip: t('🗣️ Voces 40 m', '🗣️ Voices 40 m'), best: 'night',
    text: t('Radioaficionados charlando desde media Europa. Las voces suenan algo “de pato” si no están bien centradas: mueve la sintonía un pelín hasta que se entiendan.',
      'Radio amateurs chatting from across Europe. Voices sound a bit like Donald Duck if they are not tuned in properly: nudge the tuning slightly until you can understand them.') },
  { id: 'voz20', title: t('Voces en 20 m', 'Voices on 20 m'), tune: '14200usb', chip: t('🌍 Voces 20 m', '🌍 Voices 20 m'), best: 'day',
    text: t('La banda del DX: con suerte oirás estaciones de América, Asia u Oriente Medio pasándose controles de señal muy rápidos.',
      'The DX band: with luck you will hear stations from the Americas, Asia or the Middle East swapping very quick signal reports.') },
  { id: 'cw', title: t('Morse en 40 m', 'Morse on 40 m'), tune: '7020cw', chip: '📟 Morse', best: 'any',
    text: t('Pitidos rapidísimos: es Morse de verdad. Fíjate si distingues un “CQ” (— · — ·  — — · —) o un “73” al final.',
      'Very fast beeps: this is real Morse. See if you can pick out a “CQ” (— · — ·  — — · —) or a “73” at the end.') },
  { id: 'ft8', title: t('Modo digital FT8', 'FT8 digital mode'), tune: '14074usb', chip: '🤖 Digital FT8', best: 'day',
    text: t('Un coro de pitidos que suben y bajan cada 15 segundos. Son ordenadores intercambiando contactos con señales tan débiles que el oído no las oye.',
      'A chorus of beeps that rise and fall every 15 seconds. These are computers exchanging contacts with signals so weak the human ear cannot hear them.') },
  { id: 'bc', title: t('Emisoras internacionales', 'International broadcasters'), tune: '9600am', chip: t('📻 Onda corta', '📻 Shortwave'), best: 'any',
    text: t('La banda de 31 m de radiodifusión: emisoras de otros países en idiomas de todo el mundo. Mueve la sintonía para ir saltando entre ellas.',
      'The 31 m broadcast band: stations from other countries in languages from all over the world. Move the tuning to hop between them.') },
];

// Receptores web alternativos por si el de Twente está saturado o caído
// Forma: { name: texto del enlace, url: dirección completa }. Se pintan separados por " · ".
// Cualquier URL que contenga "websdr", "kiwisdr" o "linkfanel" cuenta como logro "websdr" en journey.js.
const RECEIVERS = [
  { name: t('Lista de todos los WebSDR del mundo', 'List of every WebSDR in the world'), url: 'http://websdr.org/' },
  { name: t('Mapa de receptores KiwiSDR', 'Map of KiwiSDR receivers'), url: 'http://rx.linkfanel.net/' },
];

/* ---------- Grabaciones reales ---------- */

// Grabaciones reales con licencia libre (Wikimedia Commons). Se enlazan, no se copian al repositorio.
// Licencias y autores comprobados en Commons el 1 nov 2026. Cómo añadir más: docs/CONTENIDO.md#grabaciones-reales
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/';
/**
 * Grabaciones reales (recordings.js). Cada entrada:
 *  - file    {string}  Nombre exacto del archivo en Commons, con espacios (se usa para el enlace a su página
 *                      "File:" y como id del logro). Tiene que coincidir con el de Commons, mayúsculas incluidas.
 *  - src     {string}  URL directa del .ogg: COMMONS + '<a>/<ab>/<Nombre_con_guiones_bajos>.ogg', donde <a> y <ab>
 *                      son las carpetas que da Commons (aparecen en el enlace "Archivo original" de la página del archivo).
 *                      recordings.js deduce de aquí la URL de la versión MP3 que genera Commons.
 *  - secs    {number}  Duración aproximada en segundos (solo informativa).
 *  - kind    {string}  Categoría visible (con t()): 'Voz', 'Satélite', 'Repetidor', 'Señal débil', 'Baliza', 'Hora', 'Radiodifusión'…
 *  - author  {string}  Autor tal como figura en Commons (lo exige la licencia).
 *  - license {string}  Una de las claves de LIC en recordings.js: 'CC0', 'CC BY 4.0', 'CC BY-SA 3.0'.
 *                      Si usas otra licencia, añade su enlace a LIC o el enlace quedará en "#".
 *  - text    {string}  Qué se oye, explicado para principiantes.
 */
const RECORDINGS = [
  { file: 'CQ de DG2RBH.ogg', src: COMMONS + '8/85/CQ_de_DG2RBH.ogg', secs: 5, kind: t('Voz', 'Voice'), author: 'Dickbrettbohrer', license: 'CC0',
    text: t('Una estación alemana lanza una llamada general (CQ) en la banda de 80 m. Así empieza casi todo contacto.',
      'A German station puts out a general call (CQ) on the 80 m band. This is how almost every contact begins.') },
  { file: 'VA2HET de LZ2AA.ogg', src: COMMONS + '0/03/VA2HET_de_LZ2AA.ogg', secs: 6, kind: t('Voz', 'Voice'), author: 'Dickbrettbohrer', license: 'CC0',
    text: t('Una estación búlgara da a una canadiense el informe de cómo la recibe (RS), en la banda de 20 m.',
      'A Bulgarian station gives a Canadian one a report on how well it is being received (RS), on the 20 m band.') },
  { file: 'Ham Contest Exchange.ogg', src: COMMONS + 'd/d5/Ham_Contest_Exchange.ogg', secs: 26, kind: t('Voz', 'Voice'), author: 'Meisam', license: 'CC0',
    text: t('Un intercambio típico de concurso: informe de señal y número de serie, rápido y sin charla.',
      'A typical contest exchange: signal report and serial number, fast and with no chat.') },
  { file: 'WB6ACU.ogg', src: COMMONS + '9/92/WB6ACU.ogg', secs: 75, kind: t('Voz', 'Voice'), author: 'LuckyLouie', license: 'CC BY-SA 3.0',
    text: t('Una estación estadounidense en la banda de 75 m, grabada en el aire. Así suena la banda lateral de verdad, con su ruido.',
      'An American station on the 75 m band, recorded off the air. This is what real single sideband sounds like, noise and all.') },
  { file: 'AO-7 SSB.ogg', src: COMMONS + '5/57/AO-7_SSB.ogg', secs: 30, kind: t('Satélite', 'Satellite'), author: 'Arusch', license: 'CC BY-SA 3.0',
    text: t('Dos radioaficionados (WA9WUA y NZ3M) empiezan un contacto a través de OSCAR 7, un satélite lanzado en 1974 que sigue funcionando.',
      'Two radio amateurs (WA9WUA and NZ3M) start a contact through OSCAR 7, a satellite launched in 1974 that is still working.') },
  { file: 'Sr1g.ogg', src: COMMONS + '2/23/Sr1g.ogg', secs: 12, kind: t('Repetidor', 'Repeater'), author: 'Lubicz', license: 'CC BY-SA 3.0',
    text: t('La voz del repetidor SR1G de Kołobrzeg (Polonia) identificándose.',
      'The voice of the SR1G repeater in Kołobrzeg (Poland) identifying itself.') },
  { file: 'Echolink-DB0BHV-GB3IR.ogg', src: COMMONS + 'b/b1/Echolink-DB0BHV-GB3IR.ogg', secs: 63, kind: t('Repetidor', 'Repeater'), author: 'doco', license: 'CC BY 4.0',
    text: t('Un repetidor alemán se abre con un tono de 1.750 Hz y se enlaza por internet (EchoLink) con uno británico.',
      'A German repeater is opened with a 1,750 Hz tone and linked over the internet (EchoLink) to a British one.') },
  { file: 'SK6RUD.ogg', src: COMMONS + '2/20/SK6RUD.ogg', secs: 7, kind: t('Señal débil', 'Weak signal'), author: 'HBD20', license: 'CC BY-SA 3.0',
    text: t('Una estación sueca oída en los Países Bajos en 10,133 MHz (banda de 30 m) emitiendo con solo medio vatio.',
      'A Swedish station heard in the Netherlands on 10.133 MHz (30 m band), transmitting with just half a watt.') },
  { file: 'NCDXF beacons.ogg', src: COMMONS + '9/95/NCDXF_beacons.ogg', secs: 20, kind: t('Baliza', 'Beacon'), author: 'Cqdx', license: 'CC0',
    text: t('Las balizas OH2B (Finlandia) y CS3B (Madeira) en 14,100 MHz: indicativo y rayas cada vez más débiles.',
      'The OH2B (Finland) and CS3B (Madeira) beacons on 14.100 MHz: callsign and dashes that get weaker and weaker.') },
  { file: '2013-03-31 1948z RWM Time Signal.ogg', src: COMMONS + 'a/a5/2013-03-31_1948z_RWM_Time_Signal.ogg', secs: 31, kind: t('Hora', 'Time signal'), author: 'Samslipknot', license: 'CC0',
    text: t('La señal horaria rusa RWM recibida en onda corta: pitidos exactos cada segundo.',
      'The Russian RWM time signal received on shortwave: precise beeps every second.') },
  { file: 'BBC without carrier recovery.ogg', src: COMMONS + '9/9e/BBC_without_carrier_recovery.ogg', secs: 10, kind: t('Radiodifusión', 'Broadcasting'), author: 'Cqdx', license: 'CC BY-SA 3.0',
    text: t('La BBC en onda corta, grabada en el aire. No es radioafición, pero es lo primero que muchos oyen al girar el dial.',
      'The BBC on shortwave, recorded off the air. It is not amateur radio, but it is the first thing many people hear when they turn the dial.') },
];
