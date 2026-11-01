#!/usr/bin/env bash
# tools/solo-comentarios.sh · Comprueba que un cambio SOLO toca comentarios o líneas en blanco.
#
# Uso:   tools/solo-comentarios.sh [referencia]      (por defecto compara con HEAD)
# Útil cuando se revisa documentación del código: garantiza que no ha cambiado ninguna línea de código.
# Cuenta como comentario una línea que, sin espacios al principio, empieza por // /* * */ o <!-- -->.
set -euo pipefail
ref="${1:-HEAD}"
bad=$(git diff -U0 "$ref" -- '*.js' '*.mjs' '*.css' '*.html' \
  | grep -E '^[+-]' | grep -vE '^(\+\+\+|---) ' \
  | sed -E 's/^[+-]//' \
  | grep -vE '^\s*$' \
  | grep -vE '^\s*(//|/\*|\*|\*/|<!--|-->)' || true)
if [ -n "$bad" ]; then
  echo "✗ Hay líneas que no son comentarios:"; echo "$bad" | head -40; exit 1
fi
echo "✓ Solo cambian comentarios y líneas en blanco."
