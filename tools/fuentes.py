#!/usr/bin/env python3
"""
tools/fuentes.py · Regenera las tipografías de fonts/ a partir de los originales de Google Fonts.

Solo hace falta si se quiere cambiar de tipografía, añadir un peso o incluir caracteres que
ahora no están (por ejemplo, otro alfabeto). Explicación completa: docs/ESTILOS.md#tipografías

Requisitos (una vez):
    pip install fonttools brotli
    git clone --depth 1 --filter=blob:none --sparse https://github.com/google/fonts /tmp/google-fonts
    git -C /tmp/google-fonts sparse-checkout set ofl/barlowcondensed ofl/atkinsonhyperlegible ofl/ibmplexmono

Uso (desde la raíz del repositorio):
    python3 tools/fuentes.py /tmp/google-fonts

Qué hace con cada fuente:
  1. Recorta los glifos a los caracteres de UNICODES (latín, latín extendido, puntuación,
     flechas y unos pocos símbolos que usa la web: Ω, ≈, €, λ, π…).
  2. Si es variable, limita sus ejes a lo que usa el CSS (por ejemplo, peso 600–800).
     Los ejes que no se usan se fijan en su valor por defecto.
  3. La guarda en WOFF2 (compresión Brotli) en fonts/.
Después hay que comprobar que los nombres coinciden con los @font-face de css/style.css y,
si cambian los archivos, subir VERSION en sw.js para que se renueve la caché.
"""
import io
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# Caracteres que se conservan (formato de unicode-range de CSS).
UNICODES = ("U+0000-017F,U+0192,U+0218-021B,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0308,U+0329,"
            "U+03A9,U+03BB,U+03C0,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+2248,"
            "U+2264-2265,U+FEFF,U+FFFD")

# (archivo original dentro de google/fonts, archivo de salida, límites de ejes o None si es estática)
FONTS = [
    # Titulares: Barlow Condensed (condensada, como los rótulos grabados de los equipos de radio).
    ("ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf", "fonts/barlow-condensed-600.woff2", None),
    ("ofl/barlowcondensed/BarlowCondensed-Bold.ttf", "fonts/barlow-condensed-700.woff2", None),
    ("ofl/barlowcondensed/BarlowCondensed-ExtraBold.ttf", "fonts/barlow-condensed-800.woff2", None),
    # Texto: Atkinson Hyperlegible (diseñada para baja visión: letras que no se confunden).
    ("ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf", "fonts/atkinson-400.woff2", None),
    ("ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Italic.ttf", "fonts/atkinson-400-italic.woff2", None),
    ("ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf", "fonts/atkinson-700.woff2", None),
    # Frecuencias, horas e indicativos: IBM Plex Mono.
    ("ofl/ibmplexmono/IBMPlexMono-Regular.ttf", "fonts/ibm-plex-mono-400.woff2", None),
    ("ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf", "fonts/ibm-plex-mono-600.woff2", None),
]


def unicodes(spec):
    """Convierte 'U+0000-017F,U+20AC' en la lista de puntos de código."""
    out = []
    for part in spec.split(","):
        part = part.replace("U+", "")
        if "-" in part:
            a, b = part.split("-")
            out += range(int(a, 16), int(b, 16) + 1)
        else:
            out.append(int(part, 16))
    return out


def build(src, dst, limits):
    """Recorta, limita ejes y guarda en WOFF2. Primero se recorta y luego se instancia
    (al revés, fontTools falla con algunas fuentes variables)."""
    font = TTFont(src)
    opts = subset.Options()
    # Funciones tipográficas que se conservan: interletraje, ligaduras, acentos y cifras tabulares.
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "lnum"]
    opts.name_IDs = ["*"]          # conserva nombre, autor y licencia
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes(UNICODES))
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    font = TTFont(buf)
    if limits:
        axes = {a.axisTag: limits.get(a.axisTag, a.defaultValue) for a in font["fvar"].axes}
        font = instancer.instantiateVariableFont(font, axes)
    font.flavor = "woff2"
    font.save(dst)
    print(f"{dst}: {os.path.getsize(dst) // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    base = sys.argv[1]
    for src, dst, limits in FONTS:
        build(os.path.join(base, src), dst, limits)
