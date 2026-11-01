/**
 * backup.js · Guardar y recuperar todo el progreso en un archivo.
 *
 * Página: Inicio (#backup). Necesita: #backupSave, #backupLoad (input file), #backupNote.
 *
 * El progreso vive en localStorage (claves "radio.*", ver docs/PRIVACIDAD.md). Este módulo:
 *  - Exporta todas esas claves a un archivo JSON: { app: "radio", version: 1, fecha, datos: { clave: valor } }.
 *  - Importa ese archivo en otro navegador o dispositivo, tras validar que es de esta web y pedir confirmación.
 * Solo se aceptan claves que empiecen por "radio." y el archivo nunca sale del dispositivo.
 */
(() => {
  'use strict';
  const { $, store } = Radio;
  const save = $('backupSave');
  if (!save) return;

  const PREFIX = 'radio.';
  const keys = () => { const k = []; try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith(PREFIX)) k.push(key); } } catch (e) { /* sin almacenamiento */ } return k; };
  const note = (t, ok = true) => { $('backupNote').textContent = t; $('backupNote').classList.toggle('bad', !ok); };

  save.addEventListener('click', () => {
    const datos = Object.fromEntries(keys().map(k => [k, store.get(k)]));
    if (!Object.keys(datos).length) { note('Todavía no hay progreso que guardar.', false); return; }
    const fecha = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify({ app: 'radio', version: 1, fecha, datos }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `radio-progreso-${fecha}.json`;
    Radio.track('progreso/guardar');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    note(`Guardado: ${Object.keys(datos).length} apartados de progreso. Ábrelo en otro dispositivo con “Recuperar progreso”.`);
  });

  $('backupLoad').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (json.app !== 'radio' || typeof json.datos !== 'object') throw new Error('no es un archivo de progreso de esta web');
      const entries = Object.entries(json.datos).filter(([k]) => k.startsWith(PREFIX));
      if (!entries.length) throw new Error('el archivo no tiene progreso');
      if (!confirm(`¿Recuperar el progreso guardado el ${json.fecha || 'día desconocido'}? Sustituye al de este navegador.`)) return;
      entries.forEach(([k, v]) => store.set(k, v));
      note('Progreso recuperado. Recargando…');
      Radio.track('progreso/recuperar');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      note(`No se ha podido recuperar: ${err.message}.`, false);
    }
  });
})();
