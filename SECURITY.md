# Seguridad

## Cómo avisar de una vulnerabilidad

Si encuentras un fallo de seguridad en <https://radio.bendi.dev> o en este repositorio (por ejemplo, una forma de inyectar código en la página, un problema con la política de seguridad de contenido o algo que exponga datos de quien la visita), **no abras un aviso público**.

Usa el aviso privado de GitHub: pestaña **Security → Report a vulnerability** de este repositorio. Si no puedes, escribe a serbenda@gmail.com con el asunto `[radio] seguridad`.

Incluye, si puedes:
- Qué página o archivo está afectado.
- Pasos para reproducirlo.
- Qué podría hacer alguien con ello.

Respuesta inicial en 7 días como máximo. Cuando esté arreglado se publica una versión nueva, se anota en el [CHANGELOG](CHANGELOG.md) y, si quieres, se te cita.

## Qué cubre

La web estática (HTML, CSS, JavaScript, service worker), los flujos de GitHub Actions y la configuración del dominio. Los servicios de terceros que usa (Radio Browser, HamQTH, CelesTrak, GoatCounter, cdnjs…) tienen sus propios canales.

## Cómo está protegida

Modelo de amenazas, política de seguridad de contenido directiva a directiva y riesgos aceptados: [docs/SEGURIDAD.md](docs/SEGURIDAD.md).
