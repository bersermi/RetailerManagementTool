#!/usr/bin/env bash
# ============================================================================
# GOOGLE'S "G", CUT FROM GOOGLE'S OWN BUTTON — `11.10-i` (2026-11-28).
#
# `boton-claro@4x.png` is Google's file, unmodified: the light, icon-only, square
# button of the sign-in assets (see `../README.md` for where it came from). Its G
# sits in the middle half of the button (Google's SVG of the same button masks
# it at 10–30 of 40), so this cuts that half out — the G on the button's own
# white, pixel for pixel — and scales it, keeping its proportions, to the three
# densities the apps load. Nothing is redrawn or recoloured.
#
#   bash brand/marcas/google/render.sh      # writes g.png, g@2x.png, g@3x.png
#
# The G is drawn at 24 points (half the 48-point button, Google's own ratio).
# macOS only (`sips`). No workflow runs it; each app's `test/iconos.test.ts`
# holds its copies to these three files.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

FUENTE="boton-claro@4x.png"
[[ "$(sips -g pixelWidth "$FUENTE" | awk '/pixelWidth/ {print $2}')" == 160 ]] || { echo "FAIL: $FUENTE is not 160 wide"; exit 1; }

TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT
sips -c 80 80 "$FUENTE" --out "$TRABAJO/g80.png" >/dev/null

for par in "g.png 24" "g@2x.png 48" "g@3x.png 72"; do
  set -- $par
  sips -z "$2" "$2" "$TRABAJO/g80.png" --out "$1" >/dev/null
  echo "wrote brand/marcas/google/$1 ($2 px)"
done
