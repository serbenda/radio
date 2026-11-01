/**
 * backup.js · Guardar y recuperar todo el progreso en un archivo.
 *
 * Página: Inicio (#backup). Necesita: #backupSave (botón), #backupLoad (input type="file", oculto con
 *   .sr-only y abierto por su <label>), #backupNote (mensaje con role="status", para que se lea en voz alta).
 * Depende de: Radio ($, store, track) de core.js.
 *
 * El progreso vive en localStorage (claves "radio.*", ver docs/PRIVACIDAD.md). Este módulo:
 *  - Exporta todas esas claves a un archivo JSON: { app: "radio", version: 1, fecha, datos: { clave: valor } }.
 *      app     {string}  Siempre "radio": así se reconoce que el archivo es de esta web.
 *      version {number}  Versión del formato del archivo (1). Súbela si algún día cambia la forma.
 *      fecha   {string}  Día en que se guardó, AAAA-MM-DD (UTC).
 *      datos   {Object}  Cada clave "radio.*" con su valor ya descodificado (no como texto JSON).
 *  - Importa ese archivo en otro navegador o dispositivo, tras validar que es de esta web y pedir confirmación.
 * Solo se aceptan claves que empiecen por "radio." y el archivo nunca sale del dispositivo
 * (se genera y se lee en el navegador; no hay ninguna petición de red salvo la métrica de GoatCounter).
 * Métricas: Radio.track('progreso/guardar') y Radio.track('progreso/recuperar').
 *
 * Cómo modificarlo:
 *  - Un módulo nuevo que guarde progreso entra solo en la copia si su clave empieza por "radio.".
 *  - Cambiar el nombre del archivo descargado: `a.download` en el manejador de #backupSave.
 *  - Cambiar la forma del archivo: sube `version` al exportar y, al importar, acepta las dos versiones.
 *  - Validar más el archivo al recuperar: añade comprobaciones antes del confirm() en el manejador de #backupLoad.
 */
(() => {
  'use strict';
  const { $, store } = Radio;
  const save = $('backupSave');
  if (!save) return;

  const PREFIX = 'radio.';
  /**
   * Lista las claves de localStorage que pertenecen a esta web (empiezan por "radio.").
   * Se recorre localStorage directamente porque Radio.store no ofrece listar claves.
   * @returns {string[]} Claves encontradas; lista vacía si el almacenamiento no está disponible.
   */
  const keys = () => { const k = []; try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith(PREFIX)) k.push(key); } } catch (e) { /* sin almacenamiento */ } return k; };
  /**
   * Escribe un mensaje bajo los botones.
   * @param {string} t  Texto del mensaje.
   * @param {boolean} [ok=true]  false lo marca como error (clase CSS "bad").
   */
  const note = (t, ok = true) => { $('backupNote').textContent = t; $('backupNote').classList.toggle('bad', !ok); };

  /* ---------- Guardar ---------- */
  /**
   * Clic en "Guardar mi progreso": reúne todas las claves "radio.*" y descarga radio-progreso-AAAA-MM-DD.json.
   * La descarga se hace con un enlace temporal a un Blob (no hay servidor). La URL del Blob se libera
   * 1 s después: lo bastante tarde para que el navegador haya empezado la descarga.
   */
  save.addEventListener('click', () => {
    const datos = Object.fromEntries(keys().map(k => [k, store.get(k)]));
    if (!Object.keys(datos).length) { note('Todavía no hay progreso que guardar.', false); return; }
    const fecha = new Date().toISOString().slice(0, 10);
    // JSON con sangría de 2 espacios para que una persona pueda abrirlo y leerlo.
    const blob = new Blob([JSON.stringify({ app: 'radio', version: 1, fecha, datos }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `radio-progreso-${fecha}.json`;
    Radio.track('progreso/guardar');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    note(`Guardado: ${Object.keys(datos).length} apartados de progreso. Ábrelo en otro dispositivo con “Recuperar progreso”.`);
  });

  /* ---------- Recuperar ---------- */
  /**
   * Al elegir un archivo en "Recuperar progreso": lo lee en local, comprueba que es de esta web
   * (app === 'radio' y `datos` es un objeto), se queda solo con claves "radio.*", pide confirmación y
   * sobrescribe esas claves. Las claves "radio.*" que no vengan en el archivo se conservan.
   * Después recarga la página (a los 600 ms, para que dé tiempo a leer el mensaje), porque cada módulo
   * lee su progreso solo al cargar.
   * Errores (archivo que no es JSON, de otra web o vacío): se explican en #backupNote y no se cambia nada.
   */
  $('backupLoad').addEventListener('change', async e => {
    const file = e.target.files[0];
    // Se vacía el campo para que elegir otra vez el mismo archivo vuelva a disparar 'change'.
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
