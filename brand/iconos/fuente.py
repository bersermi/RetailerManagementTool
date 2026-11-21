# ============================================================================
# THE DRAWN ICONS, BUILT INTO ONE FONT — Step 11, row 11.3-i (2026-11-21).
#
# Run it through brand/render-fuente-iconos.sh, which makes the Python it needs.
#
# Reads    brand/iconos/mapa.json   — each drawing, its code point, the
#                                     MaterialCommunityIcons names it replaces
#          brand/iconos/<dibujo>.svg — the drawings: a 24-unit grid, a marker
#                                     line of 2 with round ends (README.md)
# Writes   brand/iconos/WeraIconos.ttf  — one glyph per drawing
#          brand/iconos/WeraIconos.json — the glyph map, keyed by the names the
#                                     apps write today, so the swap at 11.10 is
#                                     an import: @expo/vector-icons' createIconSet
#                                     (glyphMap, 'WeraIconos', require(ttf))
#
# ⚠️ THE FONT SITS WHERE MaterialCommunityIcons' DOES: the same em (512), the
# same ascent (448) and descent (-64), the 24-unit grid mapped onto the em the
# same way — so an icon lands in the same box of the same <Text>, at every size,
# on both platforms. brand/iconos/iconos.mjs measures both fonts.
#
# The output is byte-for-byte repeatable (its dates are fixed), so the check can
# tell a font that was not rebuilt after a drawing changed.
# ============================================================================

import json
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from pathops import Path as Trazo
from picosvg.svg import SVG

AQUI = Path(__file__).resolve().parent
MAPA = json.loads((AQUI / "mapa.json").read_text(encoding="utf-8"))

EM = 512           # MaterialCommunityIcons' unitsPerEm
ASCENSO = 448      # its hhea ascent: the grid's top edge
DESCENSO = -64     # its hhea descent: the grid's bottom edge
GRID = MAPA["linea"]["cuadricula"]
ESCALA = EM / GRID
FECHA = 3_975_350_400  # 2026-01-01, seconds since 1904: a fixed date, so the bytes repeat


def contornos(svg_path: Path):
    """The drawing as filled outlines: strokes outlined at their width, shapes as paths."""
    pico = SVG.parse(str(svg_path)).topicosvg()
    vista = pico.view_box()
    if (vista.x, vista.y, vista.w, vista.h) != (0, 0, GRID, GRID):
        sys.exit(f"FAIL: {svg_path.name} is not on the {GRID}-unit grid (viewBox {vista})")
    return [forma.d for forma in pico.shapes()]


def glifo(svg_path: Path, glyph_set):
    # ⚠️ ONE OUTLINE, EACH SHAPE TURNED THE SAME WAY BEFORE THEY MERGE. A browser
    # paints an SVG's shapes one over another, so which way round each was drawn
    # does not matter; a font sums every contour's winding, so a solid shape
    # drawn the other way round from the stroke around it cancels it. Merging
    # them as they come (fontTools' removeOverlaps, or pathops' union) drew
    # `play` as a hollow triangle and cut the tie out of `proveedor` — measured
    # 2026-11-21. So each shape is simplified on its own first (its outer edge
    # clockwise, a ring's hole the other way), then the whole.
    unida = Trazo()
    for d in contornos(svg_path):
        forma = Trazo()
        parse_path(d, forma.getPen())
        forma.simplify(fix_winding=True)
        forma.draw(unida.getPen())
    unida.simplify(fix_winding=True)
    pen = TTGlyphPen(glyph_set)
    # SVG's y grows down; a font's grows up from the baseline.
    unida.draw(TransformPen(Cu2QuPen(pen, max_err=0.5, reverse_direction=False),
                            (ESCALA, 0, 0, -ESCALA, 0, ASCENSO)))
    return pen.glyph()


def main():
    dibujos = MAPA["dibujos"]
    orden = [".notdef"] + list(dibujos)
    fb = FontBuilder(EM, isTTF=True)
    fb.setupGlyphOrder(orden)
    fb.setupCharacterMap({int(d["codigo"], 16): nombre for nombre, d in dibujos.items()})

    glifos = {".notdef": TTGlyphPen(None).glyph()}
    for nombre in dibujos:
        fuente = AQUI / f"{nombre}.svg"
        if not fuente.exists():
            sys.exit(f"FAIL: mapa.json names {nombre} and there is no {fuente.name}")
        glifos[nombre] = glifo(fuente, glifos)
    fb.setupGlyf(glifos)

    glyf = fb.font["glyf"]
    metricas = {}
    for nombre in orden:
        g = glyf[nombre]
        g.recalcBounds(glyf)
        metricas[nombre] = (EM, getattr(g, "xMin", 0))
    fb.setupHorizontalMetrics(metricas)
    fb.setupHorizontalHeader(ascent=ASCENSO, descent=DESCENSO, lineGap=0)
    familia = MAPA["fuente"]["familia"]
    fb.setupNameTable({
        "familyName": familia,
        "styleName": "Regular",
        "uniqueFontIdentifier": f"{familia} {MAPA['fuente']['version']}",
        "fullName": familia,
        "psName": familia.replace(" ", ""),
        "version": f"Version {MAPA['fuente']['version']}",
    })
    fb.setupOS2(sTypoAscender=ASCENSO, sTypoDescender=DESCENSO, sTypoLineGap=46,
                usWinAscent=453, usWinDescent=66, fsType=0, achVendID="WERA")
    fb.setupPost()
    fb.setupHead(unitsPerEm=EM, created=FECHA, modified=FECHA, fontRevision=float(MAPA["fuente"]["version"]))
    fb.setupMaxp()

    salida = AQUI / MAPA["fuente"]["archivo"]
    fb.save(str(salida))

    mapa_de_glifos = {}
    for nombre, d in dibujos.items():
        for mci in d["reemplaza"]:
            if mci in mapa_de_glifos:
                sys.exit(f"FAIL: {mci} is replaced by two drawings")
            mapa_de_glifos[mci] = int(d["codigo"], 16)
    (AQUI / "WeraIconos.json").write_text(
        json.dumps(dict(sorted(mapa_de_glifos.items())), indent=2) + "\n", encoding="utf-8")
    print(f"built {salida.name}: {len(dibujos)} drawings, {len(mapa_de_glifos)} names in WeraIconos.json")


if __name__ == "__main__":
    main()
