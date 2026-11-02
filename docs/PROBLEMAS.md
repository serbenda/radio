# Solución de problemas

Síntomas habituales, su causa probable y cómo arreglarlos. La herramienta principal es la **consola del navegador**: F12 (o Cmd+Opt+I en Mac) → pestaña **Consola** para errores y **Red** para peticiones.

## La web no muestra mi cambio

| Causa | Cómo saberlo | Solución |
| --- | --- | --- |
| Caché del navegador | Al recargar normal no cambia | Recarga forzando: Ctrl+F5 / Cmd+Shift+R |
| Service worker con la versión anterior | F12 → Aplicación → Service workers muestra uno activo | En local: marca "Update on reload". En la web publicada: sube `VERSION` en `sw.js` y publica |
| GitHub Pages aún no ha publicado | Actions → "pages build and deployment" en amarillo | Espera 1-2 minutos |
| El cambio está en `development`, no en `main` | La PR no está fusionada | Fusiona la pull request |
| GitHub Pages desactivado o mal configurado | Settings → Pages no muestra la URL | Settings → Pages → "Deploy from a branch" → `main` / `(root)` |

## `node tools/check.mjs` falla

Cada `✗` dice qué y dónde. Los más comunes:

| Mensaje | Causa | Solución |
| --- | --- | --- |
| `cabecera distinta en X` | Has cambiado el menú o el pie en una sola página | Copia el mismo bloque en las seis |
| `enlaces locales rotos` / `anclajes que no existen` | Un `href` a un archivo o `#id` que no existe | Corrige la ruta o el `id` |
| `Sintaxis: js/x.js` | Falta una coma, comilla o llave | Abre el archivo; `node --check js/x.js` dice la línea |
| `examen: … id repetido` | Dos preguntas con el mismo `id` | Usa el siguiente libre |
| `respuesta fuera de rango` | `ok` mayor que el número de opciones − 1 | `ok` empieza en 0 |
| `VERSION de sw.js (…) = última versión del CHANGELOG (…)` | Has subido una y no la otra | Pon el mismo número en las dos |
| `sw.js guarda … (faltan: ./js/nuevo.js)` | Módulo nuevo sin añadir al precache | Añádelo a `PRECACHE` en `sw.js` |
| `misma Content-Security-Policy` | Has cambiado la CSP en una sola página | Cópiala igual en las seis |
| `datos personales en clubs-data` | Algo parecido a un correo o teléfono | Quítalo: solo datos de la sección |

## Una sección se queda en "Cargando…" o muestra un error

1. Consola → busca mensajes en rojo.
2. Pestaña Red → filtra por el servicio (por ejemplo `hamqth`).

| Lo que ves | Causa | Solución |
| --- | --- | --- |
| `Refused to connect … violates … Content Security Policy` | El dominio no está en `connect-src` | Añádelo a la CSP de todas las páginas ([GUIA](GUIA.md#añadir-un-servicio-externo)) |
| `blocked by CORS policy` | El servicio ya no permite peticiones desde navegadores | Buscar alternativa ([DATOS.md](DATOS.md)) |
| `401` / `403` | Ahora pide clave | Buscar alternativa |
| `429` | Demasiadas peticiones | Revisa que el módulo respeta el intervalo; espera |
| `404` | Ha cambiado la dirección de la API | Revisa su documentación y cambia la constante del módulo |
| `Failed to load resource … integrity` | El archivo de cdnjs no coincide con el `integrity` | Comprueba que la URL y el hash corresponden a la misma versión |

## El mapa sale gris o sin fondo

Las teselas de Esri no cargan. Comprueba en Red si las peticiones a `arcgisonline.com` fallan. Si Esri cambia sus condiciones, el plan B (OpenStreetMap con filtro oscuro) está en [DATOS.md](DATOS.md#esri--teselas-de-mapa).

## No suena nada

| Dónde | Causa probable |
| --- | --- |
| Emisoras | La emisora está caída o no admite HTTPS: prueba otra. Los navegadores exigen un clic antes de reproducir audio |
| Sonidos de la cascada / Morse | El navegador bloquea Web Audio hasta el primer clic; el móvil en silencio también lo corta (iPhone: interruptor lateral) |
| Grabaciones reales | Wikimedia Commons caído o el archivo ha cambiado de nombre: abre la página del archivo desde el crédito |
| Voz del contacto simulado | El sistema no tiene voces en español para síntesis de voz; se puede desmarcar "Oír a la otra estación" |

## "Tu primer mes" no marca un paso

- Los pasos solo cuentan si **haces** algo (pulsar, reproducir, responder), no por visitar la página.
- Se guarda por navegador: en modo privado se pierde al cerrar.
- Para depurar, en la consola: `JSON.parse(localStorage.getItem('radio.journey'))`.
- Para empezar de cero: botón "Empezar de cero" de la portada, o `localStorage.clear()` en la consola.

## La web instalada en el móvil no se actualiza

El service worker renueva los archivos en segundo plano: el cambio se ve **en la segunda visita** tras publicar. Si se publica sin subir `VERSION`, las páginas sí se actualizan (red primero) pero CSS y JS pueden tardar una visita más. Solución definitiva: sube siempre `VERSION`.

## Un error en el móvil que no veo en el ordenador

- Modo móvil del navegador (F12 → icono de móvil, 390 px).
- Para ver la consola de un móvil real: Android + Chrome → `chrome://inspect` en el ordenador con el móvil por USB. iPhone + Safari → Ajustes → Safari → Avanzado → Inspector web, y en el Mac Safari → Desarrollo.

## Git

| Problema | Solución |
| --- | --- |
| `protected branch hook declined` o `Changes must be made through a pull request` | Has intentado subir directamente a `main` (o forzar en `development`): las ramas están protegidas. Sube a `development` y abre una pull request |
| `rejected … fetch first` al hacer push | Alguien (o tú desde otro equipo) subió cambios: `git pull` y vuelve a hacer push |
| Conflicto al hacer pull | Git marca el archivo con `<<<<<<<`. Edita y deja la versión buena, `git add`, `git commit` |
| Hice commit en `main` por error | `git branch -f development main && git checkout development && git push origin development`, y en `main`: `git reset --hard origin/main` (solo si no lo has subido) |
| Quiero deshacer el último commit (sin subir) | `git reset --soft HEAD~1` (mantiene los cambios en los archivos) |
| Quiero deshacer algo ya publicado | Revertir la PR: [GUIA.md](GUIA.md#deshacer-una-publicación-que-ha-salido-mal) |
