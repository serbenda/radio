// Morse: traductor, reproducción con Web Audio y juego de oído.
const Morse = (() => {
  const CODE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', 'Ñ': '--.--', O: '---', P: '.--.', Q: '--.-',
    R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.', '=': '-...-',
  };

  const clean = s => s.toUpperCase().normalize('NFD').replace(/(?!̃)[̀-ͯ]/g, '').normalize('NFC');
  const encode = text => clean(text).split('').map(c => (c === ' ' ? '/' : CODE[c] || '')).filter(Boolean).join(' ');

  let ctx = null, playing = null;

  // Tiempos según el estándar PARIS: un punto = 1,2 / ppm segundos
  function play(text, wpm = 15, freq = 650) {
    stop();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const dot = 1.2 / wpm;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    let t = ctx.currentTime + 0.05;
    const ramp = 0.005; // evita chasquidos
    for (const ch of clean(text)) {
      if (ch === ' ') { t += dot * 4; continue; } // 7 en total con los 3 de fin de letra
      const code = CODE[ch];
      if (!code) continue;
      for (const sym of code) {
        const len = sym === '.' ? dot : dot * 3;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + ramp);
        gain.gain.setValueAtTime(0.35, t + len - ramp);
        gain.gain.linearRampToValueAtTime(0, t + len);
        t += len + dot;
      }
      t += dot * 2;
    }
    osc.start();
    osc.stop(t + 0.05);
    playing = osc;
    return new Promise(r => { osc.onended = r; });
  }

  function stop() { if (playing) { try { playing.stop(); } catch (e) {} playing = null; } }

  return { CODE, encode, play, stop };
})();
