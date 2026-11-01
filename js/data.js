// Contenido estático de la web: bandas, jerga, alfabeto, test y FAQ.

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

const QUIZ = [
  { q: '¿Qué significa “73” al final de un contacto?',
    a: ['Fin de la emisión por avería', 'Saludos cordiales', 'Cambio de frecuencia', 'Llámame en 73 minutos'], ok: 1 },
  { q: 'Una banda de 40 metros, ¿a qué frecuencia aproximada está?',
    a: ['7 MHz', '40 MHz', '144 MHz', '400 kHz'], ok: 0,
    why: 'Longitud de onda ≈ 300 / frecuencia en MHz. 300 / 7 ≈ 43 m.' },
  { q: '¿Qué hora usan los radioaficionados para anotar sus contactos?',
    a: ['La hora local', 'La hora UTC', 'La hora de Greenwich en verano', 'La del país que llama'], ok: 1 },
  { q: '¿Por qué de noche se oyen estaciones lejanas en 40 y 80 metros?',
    a: ['Hay menos gente usando el móvil', 'Las ondas rebotan en la ionosfera', 'Las emisoras suben la potencia', 'El frío mejora los cables'], ok: 1 },
  { q: 'Ley de Ohm: con 12 V y una resistencia de 6 Ω, ¿qué corriente circula?',
    a: ['72 A', '0,5 A', '2 A', '18 A'], ok: 2, why: 'I = V / R = 12 / 6 = 2 A.' },
  { q: '¿Qué es un repetidor?',
    a: ['Un equipo que retransmite tu señal desde un sitio alto para darle más alcance', 'Alguien que repite los mensajes de voz', 'Un amplificador de audio', 'Una antena de onda corta'], ok: 0 },
  { q: '“QTH” significa…',
    a: ['Mi potencia', 'Mi localización', 'Hay interferencias', 'Recibido'], ok: 1 },
  { q: '¿Necesitas licencia para escuchar a los radioaficionados?',
    a: ['Sí, siempre', 'No, escuchar es libre', 'Solo en onda corta', 'Solo si usas un SDR'], ok: 1 },
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
