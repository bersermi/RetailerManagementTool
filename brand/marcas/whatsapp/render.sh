#!/usr/bin/env bash
# ============================================================================
# WHATSAPP'S GLYPH, SCALED FROM META'S OWN FILES — `11.10-iii` (2026-11-28).
#
# `Digital_Glyph_Green_RGB_2026.png` and `Digital_Glyph_White_RGB_2026.png` are
# Meta's files, unmodified (2880 × 2880, the glyph filling the square; see
# `../README.md` for where they came from). This only scales each, keeping its
# proportions, to the three densities the apps load: nothing is redrawn,
# recoloured or cropped.
#
#   bash brand/marcas/whatsapp/render.sh   # writes verde.png, blanco.png and their @2x, @3x
#
# The pictures are drawn at 32 points (Wera's largest icon, at *Letra grande*);
# `@/ui/Icono` draws one smaller than that without loss. macOS only (`sips`). No
# workflow runs it; each app's `test/iconos.test.ts` holds its copies to these.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

for par in "verde Green" "blanco White"; do
  set -- $par
  FUENTE="Digital_Glyph_$2_RGB_2026.png"
  [[ "$(sips -g pixelWidth "$FUENTE" | awk '/pixelWidth/ {print $2}')" == 2880 ]] || { echo "FAIL: $FUENTE is not 2880 wide"; exit 1; }
  for d in "$1.png 32" "$1@2x.png 64" "$1@3x.png 96"; do
    set -- $d
    sips -z "$2" "$2" "$FUENTE" --out "$1" >/dev/null
    echo "wrote brand/marcas/whatsapp/$1 ($2 px)"
  done
done
