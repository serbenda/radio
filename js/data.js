/**
 * data.js · Contenido estático compartido (sin lógica). Se carga en todas las páginas, justo después de core.js.
 *
 *  BANDS        Bandas de radioaficionado (IARU Región 1, aproximadas): nombre, MHz, tipo, cuándo funciona y texto.
 *  DIAL_BANDS   Las bandas de onda corta de BANDS, para el dial de la portada (dial.js).
 *  PHONETIC     Alfabeto fonético internacional y números (jargon.js, qso.js).
 *  GLOSSARY     Jerga básica para la lista de "Habla como un radioaficionado" (jargon.js).
 *  FAQ          Preguntas frecuentes [pregunta, respuesta] (faq.js).
 *  WEBSDR       URL base del WebSDR de Twente con ?tune= (guided.js, sounds.js).
 *  LISTEN       Presets de la escucha guiada: tune = "<kHz><modo>", best = day | night | any (guided.js).
 *  RECEIVERS    Receptores web alternativos (guided.js).
 *
 * Cómo añadir contenido: docs/CONTENIDO.md. tools/check.mjs valida BANDS y LISTEN.
 */

const BANDS = [
  { name: '160 m', from: 1.81, to: 2.0, kind: 'hf', when: 'Noche de invierno',
    text: 'La “banda de los pacientes”. Necesita antenas enormes y solo funciona de noche, pero un contacto transatlántico aquí es un trofeo.' },
  { name: '80 m', from: 3.5, to: 3.8, kind: 'hf', when: 'Noche',
    text: 'Charlas nocturnas entre radioaficionados de toda España y países vecinos. Mucho ruido en verano por las tormentas.' },
  { name: '40 m', from: 7.0, to: 7.2, kind: 'hf', when: 'Tarde y noche',
    text: 'La banda más animada para empezar a escuchar. De día cubre la península; de noche, toda Europa y más allá.' },
  { name: '30 m', from: 10.1, to: 10.15, kind: 'hf', when: 'Todo el día',
    text: 'Banda estrecha y tranquila: solo Morse y modos digitales. Sin concursos, sin voz.' },
  { name: '20 m', from: 14.0, to: 14.35, kind: 'hf', when: 'De día',
    text: 'La reina del DX (contactos lejanos). Abierta casi siempre a algún sitio del mundo mientras haya sol.' },
  { name: '17 m', from: 18.068, to: 18.168, kind: 'hf', when: 'De día',
    text: 'Como la de 20 m pero con menos gente. Muy agradable cuando el Sol está activo.' },
  { name: '15 m', from: 21.0, to: 21.45, kind: 'hf', when: 'De día, sol activo',
    text: 'Con buena actividad solar llegas a Sudamérica, África o Asia con muy poca potencia.' },
  { name: '12 m', from: 24.89, to: 24.99, kind: 'hf', when: 'De día, sol activo',
    text: 'Pequeña y caprichosa. Cuando se abre, sorprende.' },
  { name: '10 m', from: 28.0, to: 29.7, kind: 'hf', when: 'Máximo solar',
    text: 'En los años buenos del ciclo solar, un walkie de 5 vatios da la vuelta al mundo. En los malos, silencio.' },
  { name: '6 m', from: 50.0, to: 52.0, kind: 'vhf', when: 'Verano',
    text: 'La “banda mágica”: casi siempre cerrada, pero en verano tiene aperturas repentinas por la esporádica E.' },
  { name: '2 m', from: 144.0, to: 146.0, kind: 'vhf', when: 'Siempre (local)',
    text: 'La banda de los walkies y los repetidores. Contactos locales y con la Estación Espacial Internacional.' },
  { name: '70 cm', from: 430.0, to: 440.0, kind: 'uhf', when: 'Siempre (local)',
    text: 'Repetidores, modos digitales de voz y satélites de radioaficionado. Antenas pequeñas, alcance de ciudad.' },
];

// Bandas que recorre el dial del hero (onda corta)
const DIAL_BANDS = BANDS.filter(b => b.kind === 'hf');

const PHONETIC = {
  A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
  H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
  O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
  V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
  '0': 'Cero', '1': 'Uno', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco',
  '6': 'Seis', '7': 'Siete', '8': 'Ocho', '9': 'Nueve',
};

const GLOSSARY = [
  ['CQ', 'Llamada general: “¿hay alguien que quiera hablar?”.'],
  ['QSO', 'Un contacto o conversación por radio.'],
  ['QTH', 'Tu localización. “Mi QTH es Madrid”.'],
  ['QRZ?', '¿Quién me llama?'],
  ['QSL', 'Recibido. También la tarjeta postal que se intercambia para confirmar un contacto.'],
  ['QRM / QRN', 'Interferencias de otras estaciones / ruido atmosférico.'],
  ['QRP', 'Emitir con muy poca potencia (5 W o menos). Todo un deporte.'],
  ['DX', 'Contacto a larga distancia o con un país raro.'],
  ['73', 'Saludos cordiales. Así se despide todo el mundo.'],
  ['Indicativo', 'Tu “nombre” oficial en el aire. En España empiezan por EA, EB, EC… y un número de zona.'],
];

const FAQ = [
  ['¿Es caro?', 'Para escuchar te basta con el navegador o un SDR de unos 35 €. Un walkie para empezar con licencia cuesta menos que unas zapatillas. Luego puedes gastar lo que quieras, como en cualquier hobby.'],
  ['¿Tengo que saber Morse?', 'No. Hace años que no es obligatorio. Mucha gente lo aprende después porque engancha y porque llega más lejos con menos potencia.'],
  ['¿Es muy difícil el examen?', 'Es asequible estudiando unas semanas. Hay electricidad básica, radio, normativa y operación. Los radioclubes suelen dar cursos de preparación.'],
  ['¿Es legal escuchar?', 'Escuchar las bandas de radioaficionado es libre. Para emitir necesitas la autorización y tu indicativo.'],
  ['¿Es cosa de mayores?', 'Hay mucha gente veterana, sí, pero también grupos juveniles muy activos (busca “YOTA”, Youngsters On The Air), satélites, drones, electrónica, programación de SDR… Es un hobby muy técnico y muy actual.'],
  ['¿Mis vecinos van a oírme en la tele?', 'Con un equipo moderno, bien instalado y con potencias razonables, es muy raro. Parte del examen trata justo de evitar interferencias.'],
  ['¿Dónde encuentro gente?', 'En los radioclubes y secciones locales de la URE, en las redes (charlas programadas) de los repetidores de tu zona y en los mercadillos de radio, que son un planazo.'],
];

// Escucha guiada en el WebSDR de la Universidad de Twente (?tune=<kHz><modo>)
const WEBSDR = 'http://websdr.ewi.utwente.nl:8901/?tune=';
const LISTEN = [
  { id: 'voz40', title: 'Voces en 40 m', tune: '7150lsb', chip: '🗣️ Voces 40 m', best: 'night',
    text: 'Radioaficionados charlando desde media Europa. Las voces suenan algo “de pato” si no están bien centradas: mueve la sintonía un pelín hasta que se entiendan.' },
  { id: 'voz20', title: 'Voces en 20 m', tune: '14200usb', chip: '🌍 Voces 20 m', best: 'day',
    text: 'La banda del DX: con suerte oirás estaciones de América, Asia u Oriente Medio pasándose controles de señal muy rápidos.' },
  { id: 'cw', title: 'Morse en 40 m', tune: '7020cw', chip: '📟 Morse', best: 'any',
    text: 'Pitidos rapidísimos: es Morse de verdad. Fíjate si distingues un “CQ” (— · — ·  — — · —) o un “73” al final.' },
  { id: 'ft8', title: 'Modo digital FT8', tune: '14074usb', chip: '🤖 Digital FT8', best: 'day',
    text: 'Un coro de pitidos que suben y bajan cada 15 segundos. Son ordenadores intercambiando contactos con señales tan débiles que el oído no las oye.' },
  { id: 'bc', title: 'Emisoras internacionales', tune: '9600am', chip: '📻 Onda corta', best: 'any',
    text: 'La banda de 31 m de radiodifusión: emisoras de otros países en idiomas de todo el mundo. Mueve la sintonía para ir saltando entre ellas.' },
];

// Receptores web alternativos por si el de Twente está saturado o caído
const RECEIVERS = [
  { name: 'Lista de todos los WebSDR del mundo', url: 'http://websdr.org/' },
  { name: 'Mapa de receptores KiwiSDR', url: 'http://rx.linkfanel.net/' },
];
